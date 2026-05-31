import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { ReviewActionStatus, ReviewQueueItem } from "../contracts";

export class BootstrapReviewRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async listNeedsReviewQueue(stageBatchId?: string): Promise<ReviewQueueItem[]> {
    const db = await this.sqliteDatabase.open();
    const baseSql = `
      SELECT r.stage_batch_id, r.record_id, r.record_type, r.source_file_id, r.reason_codes_json,
             a.action_status
      FROM canonical_stage_records r
      LEFT JOIN canonical_stage_review_actions a
        ON a.stage_batch_id = r.stage_batch_id
       AND a.record_id = r.record_id
      WHERE r.status = 'needs-review'
    `;

    const sql = stageBatchId
      ? `${baseSql} AND r.stage_batch_id = ? ORDER BY r.stage_batch_id DESC, r.record_id ASC`
      : `${baseSql} ORDER BY r.stage_batch_id DESC, r.record_id ASC`;

    const rows = (stageBatchId ? db.prepare(sql).all(stageBatchId) : db.prepare(sql).all()) as Array<Record<string, unknown>>;

    return rows
      .filter((row) => {
        const action = row.action_status ? String(row.action_status) : undefined;
        return action !== "approved" && action !== "accepted-incomplete" && action !== "rejected";
      })
      .map((row) => ({
        stageBatchId: String(row.stage_batch_id),
        recordId: String(row.record_id),
        recordType: String(row.record_type),
        sourceFileId: String(row.source_file_id),
        reasonCodes: JSON.parse(String(row.reason_codes_json)) as string[]
      }));
  }

  async applyReviewAction(input: {
    stageBatchId: string;
    recordId: string;
    actionStatus: ReviewActionStatus;
    reviewNote: string;
    createdAt: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO canonical_stage_review_actions (
        stage_batch_id, record_id, action_status, review_note, created_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(stage_batch_id, record_id) DO UPDATE SET
        action_status = excluded.action_status,
        review_note = excluded.review_note,
        created_at = excluded.created_at
      `
    ).run(
      input.stageBatchId,
      input.recordId,
      input.actionStatus,
      input.reviewNote,
      input.createdAt
    );
  }

  async hasStageRecord(stageBatchId: string, recordId: string): Promise<boolean> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT 1 AS ok FROM canonical_stage_records WHERE stage_batch_id = ? AND record_id = ? LIMIT 1")
      .get(stageBatchId, recordId) as { ok: number } | undefined;
    return Boolean(row?.ok);
  }
}
