import path from "node:path";
import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { validateCanonicalImportBatch } from "@features/bootstrap-contract/main/validateCanonicalImportBatch";
import type { CanonicalRecordType } from "@features/bootstrap-contract/contracts";
import type { PreprocessRunDetails, PreprocessRunInput, PreprocessRunSummary } from "../contracts";
import { BootstrapPreprocessRepository } from "./BootstrapPreprocessRepository";

interface CanonicalRecord {
  schema_version: string;
  record_type: CanonicalRecordType;
  record_id: string;
  source_file_id: string;
  confidence_score: number;
  review_flags: string[];
  extraction_notes: string;
  [key: string]: unknown;
}

export class BootstrapPreprocessService {
  constructor(
    private readonly repository: BootstrapPreprocessRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async runPreprocess(input: PreprocessRunInput): Promise<PreprocessRunDetails> {
    if (!input.ingestBatchId.trim()) {
      throw new AppError({
        code: "BUSINESS_PREPROCESS_BATCH_REQUIRED",
        message: "ingestBatchId maste anges.",
        type: "business"
      });
    }

    const files = await this.repository.listRawFilesByBatch(input.ingestBatchId);
    if (files.length === 0) {
      throw new AppError({
        code: "BUSINESS_PREPROCESS_RAW_BATCH_NOT_FOUND",
        message: `Ingen rabatch hittades for ${input.ingestBatchId}.`,
        type: "business"
      });
    }

    const preprocessBatchId = await this.sequenceStore.next("PB");
    const createdAt = this.nowProvider().toISOString();
    const records: CanonicalRecord[] = [];

    files.forEach((file, index) => {
      records.push(this.recipeRecord(file, index + 1));
    });

    const payload = {
      schema_version: "1.0",
      ingest_batch_id: input.ingestBatchId,
      source_system: files[0].sourceSystem,
      source_exported_at: input.sourceExportedAt,
      records
    };

    const validation = validateCanonicalImportBatch(payload);
    const payloadJson = JSON.stringify(payload);

    await this.repository.savePreprocessBatch({
      preprocessBatchId,
      ingestBatchId: input.ingestBatchId,
      schemaVersion: "1.0",
      sourceSystem: files[0].sourceSystem,
      sourceExportedAt: input.sourceExportedAt,
      createdAt,
      totalRecords: records.length,
      validationOk: validation.ok,
      validationErrorCount: validation.errors.length,
      payloadJson
    });

    const saved = await this.repository.getPreprocessBatch(preprocessBatchId);
    if (!saved) {
      throw new AppError({
        code: "SYSTEM_PREPROCESS_SAVE_FAILED",
        message: "Kunde inte lasa sparad preprocessbatch.",
        type: "technical"
      });
    }

    return saved;
  }

  async listPreprocessBatches(): Promise<PreprocessRunSummary[]> {
    return this.repository.listPreprocessBatches();
  }

  async getPreprocessBatch(preprocessBatchId: string): Promise<PreprocessRunDetails> {
    const batch = await this.repository.getPreprocessBatch(preprocessBatchId);
    if (!batch) {
      throw new AppError({
        code: "BUSINESS_PREPROCESS_BATCH_NOT_FOUND",
        message: `Preprocessbatch ${preprocessBatchId} kunde inte hittas.`,
        type: "business"
      });
    }
    return batch;
  }

  private recipeRecord(file: {
    fileHash: string;
    fileType: string;
    fullPath: string;
    sizeBytes: number;
  }, ordinal: number): CanonicalRecord {
    const ext = file.fileType.toLowerCase();
    const lowerPath = file.fullPath.toLowerCase();
    const sourceFileId = file.fileHash;

    if (lowerPath.includes("invoice") || lowerPath.includes("faktura")) {
      return {
        schema_version: "1.0",
        record_type: "supplier_invoice_record",
        record_id: `INVREC-${ordinal}`,
        source_file_id: sourceFileId,
        confidence_score: 0.74,
        review_flags: ["needs-amount-confirmation"],
        extraction_notes: "Filename-driven invoice recipe.",
        supplier_name: path.basename(file.fullPath, `.${ext}`),
        gross_amount: Math.max(1, Math.round(file.sizeBytes / 100))
      };
    }

    if (ext === "csv" || ext === "xlsx") {
      return {
        schema_version: "1.0",
        record_type: "payment_event_record",
        record_id: `PAYREC-${ordinal}`,
        source_file_id: sourceFileId,
        confidence_score: 0.68,
        review_flags: ["tabular-source-needs-human-check"],
        extraction_notes: "Tabular source mapped as payment event candidate.",
        amount: Math.max(1, Math.round(file.sizeBytes / 200)),
        payment_date: this.nowProvider().toISOString().slice(0, 10)
      };
    }

    return {
      schema_version: "1.0",
      record_type: "document_record",
      record_id: `DOCREC-${ordinal}`,
      source_file_id: sourceFileId,
      confidence_score: 0.88,
      review_flags: ext === "pdf" ? [] : ["unknown-file-family"],
      extraction_notes: "Default document extraction recipe.",
      title: path.basename(file.fullPath),
      mime_family: ext || "unknown"
    };
  }
}

