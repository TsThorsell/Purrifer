import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { PreprocessRunDetails, PreprocessRunSummary } from "../contracts";

export interface RawBatchFile {
  ingestBatchId: string;
  sourceSystem: string;
  fileHash: string;
  fileType: string;
  fullPath: string;
  sizeBytes: number;
}

export class BootstrapPreprocessRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async listRawFilesByBatch(ingestBatchId: string): Promise<RawBatchFile[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT b.ingest_batch_id, b.source_system, f.file_hash, f.file_type, f.full_path, f.size_bytes
        FROM raw_ingest_batches b
        JOIN raw_ingest_files f ON f.ingest_batch_id = b.ingest_batch_id
        WHERE b.ingest_batch_id = ?
        ORDER BY f.full_path ASC
        `
      )
      .all(ingestBatchId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      ingestBatchId: String(row.ingest_batch_id),
      sourceSystem: String(row.source_system),
      fileHash: String(row.file_hash),
      fileType: String(row.file_type),
      fullPath: String(row.full_path),
      sizeBytes: Number(row.size_bytes)
    }));
  }

  async savePreprocessBatch(input: {
    preprocessBatchId: string;
    ingestBatchId: string;
    schemaVersion: string;
    sourceSystem: string;
    sourceExportedAt?: string;
    createdAt: string;
    totalRecords: number;
    validationOk: boolean;
    validationErrorCount: number;
    payloadJson: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO canonical_preprocess_batches (
        preprocess_batch_id, ingest_batch_id, schema_version, source_system, source_exported_at,
        created_at, total_records, validation_ok, validation_error_count, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.preprocessBatchId,
      input.ingestBatchId,
      input.schemaVersion,
      input.sourceSystem,
      input.sourceExportedAt ?? null,
      input.createdAt,
      input.totalRecords,
      input.validationOk ? 1 : 0,
      input.validationErrorCount,
      input.payloadJson
    );
  }

  async listPreprocessBatches(): Promise<PreprocessRunSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT preprocess_batch_id, ingest_batch_id, schema_version, source_system, source_exported_at,
               created_at, total_records, validation_ok, validation_error_count
        FROM canonical_preprocess_batches
        ORDER BY created_at DESC
        `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      preprocessBatchId: String(row.preprocess_batch_id),
      ingestBatchId: String(row.ingest_batch_id),
      schemaVersion: String(row.schema_version),
      sourceSystem: String(row.source_system),
      sourceExportedAt: row.source_exported_at ? String(row.source_exported_at) : undefined,
      createdAt: String(row.created_at),
      totalRecords: Number(row.total_records),
      validationOk: Number(row.validation_ok) === 1,
      validationErrorCount: Number(row.validation_error_count)
    }));
  }

  async getPreprocessBatch(preprocessBatchId: string): Promise<PreprocessRunDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT preprocess_batch_id, ingest_batch_id, schema_version, source_system, source_exported_at,
               created_at, total_records, validation_ok, validation_error_count, payload_json
        FROM canonical_preprocess_batches
        WHERE preprocess_batch_id = ?
        `
      )
      .get(preprocessBatchId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      preprocessBatchId: String(row.preprocess_batch_id),
      ingestBatchId: String(row.ingest_batch_id),
      schemaVersion: String(row.schema_version),
      sourceSystem: String(row.source_system),
      sourceExportedAt: row.source_exported_at ? String(row.source_exported_at) : undefined,
      createdAt: String(row.created_at),
      totalRecords: Number(row.total_records),
      validationOk: Number(row.validation_ok) === 1,
      validationErrorCount: Number(row.validation_error_count),
      payloadJson: String(row.payload_json)
    };
  }
}

