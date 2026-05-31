import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { StageBatchDetails, StageBatchSummary, StageRecordDecision } from "../contracts";

export interface PreprocessPayloadRow {
  preprocessBatchId: string;
  payloadJson: string;
}

export class BootstrapStageRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async getPreprocessPayload(preprocessBatchId: string): Promise<PreprocessPayloadRow | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT preprocess_batch_id, payload_json FROM canonical_preprocess_batches WHERE preprocess_batch_id = ?")
      .get(preprocessBatchId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      preprocessBatchId: String(row.preprocess_batch_id),
      payloadJson: String(row.payload_json)
    };
  }

  async getEntityIds(): Promise<Set<string>> {
    const db = await this.sqliteDatabase.open();
    const rows = db.prepare("SELECT entity_id FROM entities").all() as Array<Record<string, unknown>>;
    return new Set(rows.map((row) => String(row.entity_id)));
  }

  async getAccountMap(): Promise<Map<string, string>> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare("SELECT account_id, entity_id FROM entity_accounts")
      .all() as Array<Record<string, unknown>>;
    const map = new Map<string, string>();
    rows.forEach((row) => {
      map.set(String(row.account_id), String(row.entity_id));
    });
    return map;
  }

  async hasHistoricalRecordFingerprint(fingerprint: string): Promise<boolean> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT 1 AS ok FROM canonical_stage_records WHERE dedupe_fingerprint = ? LIMIT 1")
      .get(fingerprint) as { ok: number } | undefined;
    return Boolean(row?.ok);
  }

  async saveStageBatch(input: {
    stageBatchId: string;
    preprocessBatchId: string;
    createdAt: string;
    decisions: StageRecordDecision[];
    dedupeFingerprints: string[];
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const totalRecords = input.decisions.length;
    const readyCount = input.decisions.filter((item) => item.status === "ready").length;
    const needsReviewCount = input.decisions.filter((item) => item.status === "needs-review").length;
    const rejectedCount = input.decisions.filter((item) => item.status === "rejected").length;

    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO canonical_stage_batches (
          stage_batch_id, preprocess_batch_id, created_at,
          total_records, ready_count, needs_review_count, rejected_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        input.stageBatchId,
        input.preprocessBatchId,
        input.createdAt,
        totalRecords,
        readyCount,
        needsReviewCount,
        rejectedCount
      );

      const insertDecision = db.prepare(
        `
        INSERT INTO canonical_stage_records (
          stage_batch_id, record_id, record_type, source_file_id, status, reason_codes_json, dedupe_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      );

      input.decisions.forEach((decision, idx) => {
        insertDecision.run(
          input.stageBatchId,
          decision.recordId,
          decision.recordType,
          decision.sourceFileId,
          decision.status,
          JSON.stringify(decision.reasonCodes),
          input.dedupeFingerprints[idx]
        );
      });
    });

    tx();
  }

  async listStageBatches(): Promise<StageBatchSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT stage_batch_id, preprocess_batch_id, created_at,
               total_records, ready_count, needs_review_count, rejected_count
        FROM canonical_stage_batches
        ORDER BY created_at DESC
        `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      stageBatchId: String(row.stage_batch_id),
      preprocessBatchId: String(row.preprocess_batch_id),
      createdAt: String(row.created_at),
      totalRecords: Number(row.total_records),
      readyCount: Number(row.ready_count),
      needsReviewCount: Number(row.needs_review_count),
      rejectedCount: Number(row.rejected_count)
    }));
  }

  async getStageBatch(stageBatchId: string): Promise<StageBatchDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const batch = db
      .prepare(
        `
        SELECT stage_batch_id, preprocess_batch_id, created_at,
               total_records, ready_count, needs_review_count, rejected_count
        FROM canonical_stage_batches
        WHERE stage_batch_id = ?
        `
      )
      .get(stageBatchId) as Record<string, unknown> | undefined;

    if (!batch) {
      return undefined;
    }

    const rows = db
      .prepare(
        `
        SELECT record_id, record_type, source_file_id, status, reason_codes_json
        FROM canonical_stage_records
        WHERE stage_batch_id = ?
        ORDER BY rowid ASC
        `
      )
      .all(stageBatchId) as Array<Record<string, unknown>>;

    return {
      stageBatchId: String(batch.stage_batch_id),
      preprocessBatchId: String(batch.preprocess_batch_id),
      createdAt: String(batch.created_at),
      totalRecords: Number(batch.total_records),
      readyCount: Number(batch.ready_count),
      needsReviewCount: Number(batch.needs_review_count),
      rejectedCount: Number(batch.rejected_count),
      decisions: rows.map((row) => ({
        recordId: String(row.record_id),
        recordType: String(row.record_type),
        sourceFileId: String(row.source_file_id),
        status: String(row.status) as StageRecordDecision["status"],
        reasonCodes: JSON.parse(String(row.reason_codes_json)) as string[]
      }))
    };
  }
}
