import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  ImportBatchDetails,
  ImportBatchSummary,
  ImportBatchStatus,
  ImportCommitRow,
  ImportFileType,
  ImportObjectType,
  ImportReviewAccount,
  ImportReviewEntity,
  ImportRowMapping,
  ImportedTransactionRow
} from "../contracts";

export class TransactionImportRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async createBatch(input: {
    batchId: string;
    fileName: string;
    fileType: ImportFileType;
    source: string;
    status: ImportBatchStatus;
    importedAt: string;
    statusReason?: string;
    rows: ImportedTransactionRow[];
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const totalRows = input.rows.length;
    const validRows = input.rows.filter((row) => row.isValid).length;
    const invalidRows = totalRows - validRows;

    db.prepare(
      `
      INSERT INTO import_batches (
        batch_id, file_name, file_type, imported_at, total_rows, valid_rows, invalid_rows, rows_json, source, status, status_reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.batchId,
      input.fileName,
      input.fileType,
      input.importedAt,
      totalRows,
      validRows,
      invalidRows,
      JSON.stringify(input.rows),
      input.source,
      input.status,
      input.statusReason ?? null
    );
  }

  async listBatches(): Promise<ImportBatchSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT batch_id, file_name, file_type, imported_at, source, status, status_reason, total_rows, valid_rows, invalid_rows
        FROM import_batches
        ORDER BY imported_at DESC
        `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      batchId: String(row.batch_id),
      fileName: String(row.file_name),
      fileType: row.file_type as ImportFileType,
      source: String(row.source),
      status: (row.status as ImportBatchStatus) ?? "ready",
      statusReason: row.status_reason ? String(row.status_reason) : undefined,
      importedAt: String(row.imported_at),
      totalRows: Number(row.total_rows),
      validRows: Number(row.valid_rows),
      invalidRows: Number(row.invalid_rows)
    }));
  }

  async findBatchById(batchId: string): Promise<ImportBatchDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT batch_id, file_name, file_type, imported_at, source, status, status_reason, total_rows, valid_rows, invalid_rows, rows_json
        FROM import_batches
        WHERE batch_id = ?
        `
      )
      .get(batchId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      batchId: String(row.batch_id),
      fileName: String(row.file_name),
      fileType: row.file_type as ImportFileType,
      source: String(row.source),
      status: (row.status as ImportBatchStatus) ?? "ready",
      statusReason: row.status_reason ? String(row.status_reason) : undefined,
      importedAt: String(row.imported_at),
      totalRows: Number(row.total_rows),
      validRows: Number(row.valid_rows),
      invalidRows: Number(row.invalid_rows),
      rows: JSON.parse(String(row.rows_json)) as ImportedTransactionRow[]
    };
  }

  async listReviewEntities(): Promise<ImportReviewEntity[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db.prepare("SELECT entity_id, name FROM entities ORDER BY name ASC").all() as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => ({
      entityId: String(row.entity_id),
      name: String(row.name)
    }));
  }

  async listReviewAccounts(): Promise<ImportReviewAccount[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare("SELECT account_id, entity_id, name FROM entity_accounts ORDER BY name ASC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      accountId: String(row.account_id),
      entityId: String(row.entity_id),
      name: String(row.name)
    }));
  }

  async listRowMappings(batchId: string): Promise<ImportRowMapping[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT batch_id, row_number, entity_id, account_id, object_type, updated_at
        FROM import_row_mappings
        WHERE batch_id = ?
        ORDER BY row_number ASC
        `
      )
      .all(batchId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      batchId: String(row.batch_id),
      rowNumber: Number(row.row_number),
      entityId: row.entity_id ? String(row.entity_id) : undefined,
      accountId: row.account_id ? String(row.account_id) : undefined,
      objectType: row.object_type ? (String(row.object_type) as ImportObjectType) : undefined,
      updatedAt: String(row.updated_at)
    }));
  }

  async upsertRowMapping(input: {
    batchId: string;
    rowNumber: number;
    entityId: string;
    accountId: string;
    objectType: ImportObjectType;
    updatedAt: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO import_row_mappings (
        batch_id, row_number, entity_id, account_id, object_type, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(batch_id, row_number) DO UPDATE SET
        entity_id = excluded.entity_id,
        account_id = excluded.account_id,
        object_type = excluded.object_type,
        updated_at = excluded.updated_at
      `
    ).run(
      input.batchId,
      input.rowNumber,
      input.entityId,
      input.accountId,
      input.objectType,
      input.updatedAt
    );
  }

  async createCommit(input: {
    commitId: string;
    batchId: string;
    committedAt: string;
    totalRows: number;
    committedRows: ImportCommitRow[];
    rowLookup: Map<number, ImportedTransactionRow>;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO import_commits (
          commit_id, batch_id, committed_at, total_rows, committed_rows
        )
        VALUES (?, ?, ?, ?, ?)
        `
      ).run(
        input.commitId,
        input.batchId,
        input.committedAt,
        input.totalRows,
        input.committedRows.length
      );

      const insertRow = db.prepare(
        `
        INSERT INTO import_commit_rows (
          commit_row_id, commit_id, batch_id, row_number, entity_id, account_id, object_type, row_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      );

      input.committedRows.forEach((row, idx) => {
        const sourceRow = input.rowLookup.get(row.rowNumber);
        insertRow.run(
          `${input.commitId}-${String(idx + 1).padStart(4, "0")}`,
          input.commitId,
          input.batchId,
          row.rowNumber,
          row.entityId,
          row.accountId,
          row.objectType,
          JSON.stringify(sourceRow ?? null),
          input.committedAt
        );
      });

      db.prepare("UPDATE import_batches SET status = ?, status_reason = ? WHERE batch_id = ?").run(
        "committed",
        "Batch commit slutförd.",
        input.batchId
      );
    });
    tx();
  }

  async updateBatchStatus(batchId: string, status: ImportBatchStatus, statusReason?: string | null): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const result = db
      .prepare("UPDATE import_batches SET status = ?, status_reason = ? WHERE batch_id = ?")
      .run(status, statusReason ?? null, batchId);
    if (result.changes === 0) {
      throw new Error(`No import batch found for id ${batchId}`);
    }
  }
}
