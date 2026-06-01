import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { RawIngestBatchDetails, RawIngestBatchSummary, RawIngestFileResult } from "../contracts";

export class BootstrapIntakeRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async createBatch(input: {
    ingestBatchId: string;
    sourceSystem: string;
    createdAt: string;
    sourceFolders: string[];
    scannerDeviceName?: string;
    scannerProfile?: string;
    scanMode?: "simplex" | "duplex";
    feederMode?: "flatbed" | "adf";
    scanTimestamp?: string;
    totalDiscovered: number;
    totalNew: number;
    totalDuplicates: number;
    totalErrors: number;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO raw_ingest_batches (
        ingest_batch_id, source_system, created_at, source_folders_json,
        scanner_device_name, scanner_profile, scan_mode, feeder_mode, scan_timestamp,
        total_discovered, total_new, total_duplicates, total_errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.ingestBatchId,
      input.sourceSystem,
      input.createdAt,
      JSON.stringify(input.sourceFolders),
      input.scannerDeviceName ?? null,
      input.scannerProfile ?? null,
      input.scanMode ?? null,
      input.feederMode ?? null,
      input.scanTimestamp ?? null,
      input.totalDiscovered,
      input.totalNew,
      input.totalDuplicates,
      input.totalErrors
    );
  }

  async insertBatchFile(input: {
    ingestBatchId: string;
    file: RawIngestFileResult;
  }): Promise<void> {
    if (!input.file.hash) {
      return;
    }

    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT OR IGNORE INTO raw_ingest_files (
        ingest_batch_id, full_path, file_type, size_bytes, file_hash,
        status, duplicate_scope, error_message, scan_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.ingestBatchId,
      input.file.fullPath,
      input.file.fileType,
      input.file.sizeBytes,
      input.file.hash,
      input.file.status,
      input.file.duplicateScope ?? null,
      input.file.errorMessage ?? null,
      input.file.scanTimestamp ?? null
    );
  }

  async hasExistingHash(hash: string): Promise<boolean> {
    const db = await this.sqliteDatabase.open();
    const row = db.prepare("SELECT 1 AS ok FROM raw_ingest_files WHERE file_hash = ? LIMIT 1").get(hash) as
      | { ok: number }
      | undefined;
    return Boolean(row?.ok);
  }

  async listBatches(): Promise<RawIngestBatchSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT ingest_batch_id, source_system, created_at, scanner_device_name, scanner_profile, scan_mode, feeder_mode, scan_timestamp, total_discovered, total_new, total_duplicates, total_errors
        FROM raw_ingest_batches
        ORDER BY created_at DESC
        `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      ingestBatchId: String(row.ingest_batch_id),
      sourceSystem: String(row.source_system),
      createdAt: String(row.created_at),
      scannerDeviceName: row.scanner_device_name ? String(row.scanner_device_name) : undefined,
      scannerProfile: row.scanner_profile ? String(row.scanner_profile) : undefined,
      scanMode: row.scan_mode ? String(row.scan_mode) as RawIngestBatchSummary["scanMode"] : undefined,
      feederMode: row.feeder_mode ? String(row.feeder_mode) as RawIngestBatchSummary["feederMode"] : undefined,
      scanTimestamp: row.scan_timestamp ? String(row.scan_timestamp) : undefined,
      totalDiscovered: Number(row.total_discovered),
      totalNew: Number(row.total_new),
      totalDuplicates: Number(row.total_duplicates),
      totalErrors: Number(row.total_errors)
    }));
  }

  async getBatch(ingestBatchId: string): Promise<RawIngestBatchDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const batchRow = db
      .prepare(
        `
        SELECT ingest_batch_id, source_system, created_at, source_folders_json, scanner_device_name, scanner_profile, scan_mode, feeder_mode, scan_timestamp,
               total_discovered, total_new, total_duplicates, total_errors
        FROM raw_ingest_batches
        WHERE ingest_batch_id = ?
        `
      )
      .get(ingestBatchId) as Record<string, unknown> | undefined;

    if (!batchRow) {
      return undefined;
    }

    const fileRows = db
      .prepare(
        `
        SELECT full_path, file_type, size_bytes, file_hash, status, duplicate_scope, error_message, scan_timestamp
        FROM raw_ingest_files
        WHERE ingest_batch_id = ?
        ORDER BY full_path ASC
        `
      )
      .all(ingestBatchId) as Array<Record<string, unknown>>;

    return {
      ingestBatchId: String(batchRow.ingest_batch_id),
      sourceSystem: String(batchRow.source_system),
      createdAt: String(batchRow.created_at),
      sourceFolders: JSON.parse(String(batchRow.source_folders_json)) as string[],
      scannerDeviceName: batchRow.scanner_device_name ? String(batchRow.scanner_device_name) : undefined,
      scannerProfile: batchRow.scanner_profile ? String(batchRow.scanner_profile) : undefined,
      scanMode: batchRow.scan_mode ? String(batchRow.scan_mode) as RawIngestBatchSummary["scanMode"] : undefined,
      feederMode: batchRow.feeder_mode ? String(batchRow.feeder_mode) as RawIngestBatchSummary["feederMode"] : undefined,
      scanTimestamp: batchRow.scan_timestamp ? String(batchRow.scan_timestamp) : undefined,
      totalDiscovered: Number(batchRow.total_discovered),
      totalNew: Number(batchRow.total_new),
      totalDuplicates: Number(batchRow.total_duplicates),
      totalErrors: Number(batchRow.total_errors),
      files: fileRows.map((row) => ({
        fullPath: String(row.full_path),
        fileType: String(row.file_type),
        sizeBytes: Number(row.size_bytes),
        hash: row.file_hash ? String(row.file_hash) : null,
        scanTimestamp: row.scan_timestamp ? String(row.scan_timestamp) : undefined,
        status: String(row.status) as RawIngestFileResult["status"],
        duplicateScope: row.duplicate_scope
          ? String(row.duplicate_scope) as RawIngestFileResult["duplicateScope"]
          : undefined,
        errorMessage: row.error_message ? String(row.error_message) : undefined
      }))
    };
  }
}

