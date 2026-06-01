import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";

export interface DashboardBatchRow {
  ingestBatchId: string;
  stageBatchId: string;
  sourceSystem: string;
  stageCreatedAt: string;
  totalRecords: number;
  readyCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  committedCount: number;
}

export interface DashboardReasonRow {
  reasonCodesJson: string;
}

export interface DashboardReviewRow {
  actionStatus: string;
}

export interface DashboardPreprocessPayloadRow {
  payloadJson: string;
}

export class BootstrapPilotDashboardRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async listBatchRows(filter?: { ingestBatchId?: string; stageBatchId?: string; sourceSystem?: string }): Promise<DashboardBatchRow[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (filter?.ingestBatchId) {
      conditions.push("pb.ingest_batch_id = ?");
      args.push(filter.ingestBatchId);
    }
    if (filter?.stageBatchId) {
      conditions.push("sb.stage_batch_id = ?");
      args.push(filter.stageBatchId);
    }
    if (filter?.sourceSystem) {
      conditions.push("pb.source_system = ?");
      args.push(filter.sourceSystem);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(
      `
      SELECT
        pb.ingest_batch_id,
        sb.stage_batch_id,
        pb.source_system,
        sb.created_at AS stage_created_at,
        sb.total_records,
        sb.ready_count,
        sb.needs_review_count,
        sb.rejected_count,
        COALESCE(cb.committed_count, 0) AS committed_count
      FROM canonical_stage_batches sb
      JOIN canonical_preprocess_batches pb ON pb.preprocess_batch_id = sb.preprocess_batch_id
      LEFT JOIN canonical_commit_batches cb ON cb.stage_batch_id = sb.stage_batch_id
      ${where}
      ORDER BY sb.created_at DESC
      `
    ).all(...args) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      ingestBatchId: String(row.ingest_batch_id),
      stageBatchId: String(row.stage_batch_id),
      sourceSystem: String(row.source_system),
      stageCreatedAt: String(row.stage_created_at),
      totalRecords: Number(row.total_records),
      readyCount: Number(row.ready_count),
      needsReviewCount: Number(row.needs_review_count),
      rejectedCount: Number(row.rejected_count),
      committedCount: Number(row.committed_count)
    }));
  }

  async listReasonRows(filter?: { ingestBatchId?: string; stageBatchId?: string; sourceSystem?: string }): Promise<DashboardReasonRow[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (filter?.ingestBatchId) {
      conditions.push("pb.ingest_batch_id = ?");
      args.push(filter.ingestBatchId);
    }
    if (filter?.stageBatchId) {
      conditions.push("sr.stage_batch_id = ?");
      args.push(filter.stageBatchId);
    }
    if (filter?.sourceSystem) {
      conditions.push("pb.source_system = ?");
      args.push(filter.sourceSystem);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(
      `
      SELECT sr.reason_codes_json
      FROM canonical_stage_records sr
      JOIN canonical_stage_batches sb ON sb.stage_batch_id = sr.stage_batch_id
      JOIN canonical_preprocess_batches pb ON pb.preprocess_batch_id = sb.preprocess_batch_id
      ${where}
      `
    ).all(...args) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      reasonCodesJson: String(row.reason_codes_json)
    }));
  }

  async listReviewRows(filter?: { ingestBatchId?: string; stageBatchId?: string; sourceSystem?: string }): Promise<DashboardReviewRow[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (filter?.ingestBatchId) {
      conditions.push("pb.ingest_batch_id = ?");
      args.push(filter.ingestBatchId);
    }
    if (filter?.stageBatchId) {
      conditions.push("ra.stage_batch_id = ?");
      args.push(filter.stageBatchId);
    }
    if (filter?.sourceSystem) {
      conditions.push("pb.source_system = ?");
      args.push(filter.sourceSystem);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(
      `
      SELECT ra.action_status
      FROM canonical_stage_review_actions ra
      JOIN canonical_stage_batches sb ON sb.stage_batch_id = ra.stage_batch_id
      JOIN canonical_preprocess_batches pb ON pb.preprocess_batch_id = sb.preprocess_batch_id
      ${where}
      `
    ).all(...args) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      actionStatus: String(row.action_status)
    }));
  }

  async listPreprocessPayloadRows(filter?: { ingestBatchId?: string; stageBatchId?: string; sourceSystem?: string }): Promise<DashboardPreprocessPayloadRow[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (filter?.ingestBatchId) {
      conditions.push("pb.ingest_batch_id = ?");
      args.push(filter.ingestBatchId);
    }
    if (filter?.stageBatchId) {
      conditions.push("sb.stage_batch_id = ?");
      args.push(filter.stageBatchId);
    }
    if (filter?.sourceSystem) {
      conditions.push("pb.source_system = ?");
      args.push(filter.sourceSystem);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(
      `
      SELECT pb.payload_json
      FROM canonical_preprocess_batches pb
      JOIN canonical_stage_batches sb ON sb.preprocess_batch_id = pb.preprocess_batch_id
      ${where}
      `
    ).all(...args) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      payloadJson: String(row.payload_json)
    }));
  }
}


