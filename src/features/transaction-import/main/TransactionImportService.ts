import { readFile } from "node:fs/promises";
import path from "node:path";
import { dialog, type BrowserWindow } from "electron";
import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import * as XLSX from "xlsx";
import type {
  ImportBatchDetails,
  ImportBatchSummary,
  ImportCommitResult,
  ImportFileType,
  ImportPreview,
  ImportReview,
  ImportReviewRow,
  ImportRowMapping,
  ImportedTransactionRow,
  SaveImportRowMappingInput
} from "../contracts";
import { TransactionImportRepository } from "./TransactionImportRepository";

export class TransactionImportService {
  constructor(
    private readonly repository: TransactionImportRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async selectAndPreviewImportFile(window: BrowserWindow): Promise<ImportPreview | null> {
    const result = await dialog.showOpenDialog(window, {
      title: "Valj transaktionsunderlag",
      filters: [{ name: "Transaktionsunderlag", extensions: ["csv", "xlsx"] }],
      properties: ["openFile"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const fileType: ImportFileType = extension === ".xlsx" ? "xlsx" : "csv";
    const rows = fileType === "csv" ? await this.parseCsv(filePath) : await this.parseXlsx(filePath);

    const batchId = await this.sequenceStore.next("IB");
    const importedAt = this.nowProvider().toISOString();

    await this.repository.createBatch({
      batchId,
      fileName,
      fileType,
      importedAt,
      rows
    });

    const validRows = rows.filter((row) => row.isValid).length;
    return {
      batchId,
      fileName,
      fileType,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows
    };
  }

  async listImportBatches(): Promise<ImportBatchSummary[]> {
    return this.repository.listBatches();
  }

  async getImportBatch(batchId: string): Promise<ImportBatchDetails> {
    const batch = await this.repository.findBatchById(batchId);
    if (!batch) {
      throw new AppError({
        code: "BUSINESS_IMPORT_BATCH_NOT_FOUND",
        message: `Importbatch ${batchId} kunde inte hittas.`,
        type: "business"
      });
    }
    return batch;
  }

  async getImportReview(batchId: string): Promise<ImportReview> {
    const batch = await this.getImportBatch(batchId);
    const [entities, accounts, mappings] = await Promise.all([
      this.repository.listReviewEntities(),
      this.repository.listReviewAccounts(),
      this.repository.listRowMappings(batchId)
    ]);
    const mappingByRow = new Map<number, ImportRowMapping>(
      mappings.map((mapping) => [mapping.rowNumber, mapping])
    );
    const rows: ImportReviewRow[] = batch.rows.map((row) => {
      const mapping = mappingByRow.get(row.rowNumber);
      const isMapped = Boolean(mapping?.entityId && mapping?.accountId && mapping?.objectType);
      return {
        ...row,
        mapping,
        isMapped
      };
    });
    return { batch, entities, accounts, rows };
  }

  async saveImportRowMapping(input: SaveImportRowMappingInput): Promise<ImportRowMapping> {
    const batch = await this.getImportBatch(input.batchId);
    const row = batch.rows.find((item) => item.rowNumber === input.rowNumber);
    if (!row) {
      throw new AppError({
        code: "BUSINESS_IMPORT_ROW_NOT_FOUND",
        message: `Rad ${input.rowNumber} hittades inte i batch ${input.batchId}.`,
        type: "business"
      });
    }

    const [entities, accounts] = await Promise.all([
      this.repository.listReviewEntities(),
      this.repository.listReviewAccounts()
    ]);
    const entity = entities.find((item) => item.entityId === input.entityId);
    if (!entity) {
      throw new AppError({
        code: "BUSINESS_IMPORT_ENTITY_NOT_FOUND",
        message: `Entitet ${input.entityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const account = accounts.find((item) => item.accountId === input.accountId);
    if (!account) {
      throw new AppError({
        code: "BUSINESS_IMPORT_ACCOUNT_NOT_FOUND",
        message: `Konto ${input.accountId} kunde inte hittas.`,
        type: "business"
      });
    }
    if (account.entityId !== input.entityId) {
      throw new AppError({
        code: "BUSINESS_IMPORT_ACCOUNT_ENTITY_MISMATCH",
        message: "Valt konto tillhor inte vald entitet.",
        type: "business"
      });
    }

    const updatedAt = this.nowProvider().toISOString();
    await this.repository.upsertRowMapping({
      ...input,
      updatedAt
    });
    return {
      ...input,
      updatedAt
    };
  }

  async commitImportBatch(batchId: string): Promise<ImportCommitResult> {
    const review = await this.getImportReview(batchId);
    const committedRows = review.rows
      .filter((row) => row.isValid && row.isMapped && row.mapping)
      .map((row) => ({
        rowNumber: row.rowNumber,
        entityId: row.mapping!.entityId!,
        accountId: row.mapping!.accountId!,
        objectType: row.mapping!.objectType!
      }));

    if (committedRows.length === 0) {
      throw new AppError({
        code: "BUSINESS_IMPORT_NOTHING_TO_COMMIT",
        message: "Det finns inga giltiga och mappade rader att committa.",
        type: "business"
      });
    }

    const commitId = await this.sequenceStore.next("IC");
    const committedAt = this.nowProvider().toISOString();
    const rowLookup = new Map<number, ImportedTransactionRow>(
      review.batch.rows.map((row) => [row.rowNumber, row])
    );

    await this.repository.createCommit({
      commitId,
      batchId,
      committedAt,
      totalRows: review.batch.totalRows,
      committedRows,
      rowLookup
    });

    return {
      commitId,
      batchId,
      committedAt,
      totalRows: review.batch.totalRows,
      committedRows: committedRows.length,
      rows: committedRows
    };
  }

  private async parseCsv(filePath: string): Promise<ImportedTransactionRow[]> {
    const content = await readFile(filePath, "utf8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return [];
    }

    const headerParts = lines[0].split(",").map((part) => part.trim().toLowerCase());
    const dateIndex = headerParts.findIndex((entry) => entry === "date" || entry === "datum");
    const descriptionIndex = headerParts.findIndex(
      (entry) => entry === "description" || entry === "beskrivning" || entry === "text"
    );
    const amountIndex = headerParts.findIndex((entry) => entry === "amount" || entry === "belopp");

    return lines.slice(1).map((line, idx) => {
      const rowNumber = idx + 2;
      const values = line.split(",").map((part) => part.trim());
      const date = dateIndex >= 0 ? values[dateIndex] : undefined;
      const description = descriptionIndex >= 0 ? values[descriptionIndex] : undefined;
      const amountRaw = amountIndex >= 0 ? values[amountIndex] : undefined;
      const amount = amountRaw !== undefined ? Number(String(amountRaw).replace(",", ".")) : undefined;
      return this.validateRow({ rowNumber, date, description, amount });
    });
  }

  private async parseXlsx(filePath: string): Promise<ImportedTransactionRow[]> {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

    return rows.map((row, idx) => {
      const rowNumber = idx + 2;
      const date = String(row.date ?? row.datum ?? "").trim();
      const description = String(row.description ?? row.beskrivning ?? row.text ?? "").trim();
      const rawAmount = row.amount ?? row.belopp;
      const amount = rawAmount === undefined || rawAmount === "" ? undefined : Number(rawAmount);
      return this.validateRow({ rowNumber, date, description, amount });
    });
  }

  private validateRow(input: {
    rowNumber: number;
    date?: string;
    description?: string;
    amount?: number;
  }): ImportedTransactionRow {
    const validationErrors: string[] = [];

    if (!input.date) {
      validationErrors.push("Datum saknas.");
    }
    if (!input.description) {
      validationErrors.push("Beskrivning saknas.");
    }
    if (input.amount === undefined || Number.isNaN(input.amount)) {
      validationErrors.push("Belopp saknas eller ar ogiltigt.");
    }

    return {
      rowNumber: input.rowNumber,
      date: input.date,
      description: input.description,
      amount: input.amount,
      isValid: validationErrors.length === 0,
      validationErrors
    };
  }
}
