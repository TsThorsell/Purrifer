import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { AuditTrailItem } from "../contracts";

export class BootstrapAuditRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async listAuditTrail(filter?: { sourceFileId?: string; commitBatchId?: string }): Promise<AuditTrailItem[]> {
    const db = await this.sqliteDatabase.open();

    let where = "";
    const args: unknown[] = [];
    if (filter?.sourceFileId) {
      where = "WHERE p.source_file_id = ?";
      args.push(filter.sourceFileId);
    } else if (filter?.commitBatchId) {
      where = "WHERE p.commit_batch_id = ?";
      args.push(filter.commitBatchId);
    }

    const rows = db.prepare(
      `
      SELECT
        p.source_file_id,
        pb.ingest_batch_id,
        sb.preprocess_batch_id,
        sb.stage_batch_id,
        sr.record_id,
        sr.record_type,
        sr.status AS stage_status,
        sb.created_at AS stage_created_at,
        ra.action_status AS review_action_status,
        ra.review_note,
        ra.created_at AS review_at,
        p.commit_batch_id,
        cb.committed_at,
        p.object_type,
        p.object_id
      FROM proof_chain_links p
      JOIN canonical_commit_batches cb ON cb.commit_batch_id = p.commit_batch_id
      JOIN canonical_commit_records cr ON cr.commit_batch_id = cb.commit_batch_id AND cr.record_id = p.record_id
      JOIN canonical_stage_batches sb ON sb.stage_batch_id = cb.stage_batch_id
      JOIN canonical_stage_records sr ON sr.stage_batch_id = sb.stage_batch_id AND sr.record_id = p.record_id
      JOIN canonical_preprocess_batches pb ON pb.preprocess_batch_id = sb.preprocess_batch_id
      LEFT JOIN canonical_stage_review_actions ra ON ra.stage_batch_id = sr.stage_batch_id AND ra.record_id = sr.record_id
      ${where}
      ORDER BY cb.committed_at DESC, p.record_id ASC
      `
    ).all(...args) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      sourceFileId: String(row.source_file_id),
      ingestBatchId: String(row.ingest_batch_id),
      preprocessBatchId: String(row.preprocess_batch_id),
      stageBatchId: String(row.stage_batch_id),
      recordId: String(row.record_id),
      recordType: String(row.record_type),
      stageStatus: String(row.stage_status),
      stageCreatedAt: String(row.stage_created_at),
      reviewActionStatus: row.review_action_status ? String(row.review_action_status) : undefined,
      reviewNote: row.review_note ? String(row.review_note) : undefined,
      reviewAt: row.review_at ? String(row.review_at) : undefined,
      commitBatchId: row.commit_batch_id ? String(row.commit_batch_id) : undefined,
      committedAt: row.committed_at ? String(row.committed_at) : undefined,
      objectType: row.object_type ? String(row.object_type) : undefined,
      objectId: row.object_id ? String(row.object_id) : undefined
    }));
  }
}
