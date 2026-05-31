import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { BootstrapCommitObject, BootstrapCommitResult, BootstrapCommitSummary } from "../contracts";

export interface StageDecisionRow {
  stageBatchId: string;
  preprocessBatchId: string;
  recordId: string;
  recordType: string;
  sourceFileId: string;
  status: string;
}

export interface ReviewDecisionRow {
  actionStatus: string;
}

export class BootstrapCommitRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}
  async listCommittedRecordIdsForStageBatch(stageBatchId: string): Promise<Set<string>> {
    const db = await this.sqliteDatabase.open();
    const rows = db.prepare(
      "SELECT record_id FROM canonical_commit_records WHERE stage_batch_id = ?"
    ).all(stageBatchId) as Array<Record<string, unknown>>;
    return new Set(rows.map((row) => String(row.record_id)));
  }

  async findLatestCommitByStageBatch(stageBatchId: string): Promise<BootstrapCommitResult | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db.prepare(
      "SELECT commit_batch_id FROM canonical_commit_batches WHERE stage_batch_id = ? ORDER BY committed_at DESC LIMIT 1"
    ).get(stageBatchId) as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }
    return this.getCommit(String(row.commit_batch_id));
  }

  async listStageDecisions(stageBatchId: string): Promise<StageDecisionRow[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db.prepare(
      `
      SELECT b.stage_batch_id, b.preprocess_batch_id, r.record_id, r.record_type, r.source_file_id, r.status
      FROM canonical_stage_batches b
      JOIN canonical_stage_records r ON r.stage_batch_id = b.stage_batch_id
      WHERE b.stage_batch_id = ?
      ORDER BY r.rowid ASC
      `
    ).all(stageBatchId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      stageBatchId: String(row.stage_batch_id),
      preprocessBatchId: String(row.preprocess_batch_id),
      recordId: String(row.record_id),
      recordType: String(row.record_type),
      sourceFileId: String(row.source_file_id),
      status: String(row.status)
    }));
  }

  async getReviewDecision(stageBatchId: string, recordId: string): Promise<ReviewDecisionRow | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT action_status FROM canonical_stage_review_actions WHERE stage_batch_id = ? AND record_id = ?")
      .get(stageBatchId, recordId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }
    return { actionStatus: String(row.action_status) };
  }

  async getPreprocessPayload(preprocessBatchId: string): Promise<Record<string, unknown> | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT payload_json FROM canonical_preprocess_batches WHERE preprocess_batch_id = ?")
      .get(preprocessBatchId) as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }
    return JSON.parse(String(row.payload_json)) as Record<string, unknown>;
  }

  async saveCommit(input: {
    commitBatchId: string;
    stageBatchId: string;
    committedAt: string;
    objects: BootstrapCommitObject[];
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO canonical_commit_batches (commit_batch_id, stage_batch_id, committed_at, committed_count)
        VALUES (?, ?, ?, ?)
        `
      ).run(input.commitBatchId, input.stageBatchId, input.committedAt, input.objects.length);

      const insertCommitRecord = db.prepare(
        `
        INSERT INTO canonical_commit_records (
          commit_batch_id, stage_batch_id, record_id, record_type, object_type, object_id
        ) VALUES (?, ?, ?, ?, ?, ?)
        `
      );

      const insertProofLink = db.prepare(
        `
        INSERT INTO proof_chain_links (
          proof_link_id, commit_batch_id, source_file_id, record_id, object_type, object_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      );

      input.objects.forEach((obj, idx) => {
        insertCommitRecord.run(
          input.commitBatchId,
          input.stageBatchId,
          obj.recordId,
          obj.recordType,
          obj.objectType,
          obj.objectId
        );
        insertProofLink.run(
          `${input.commitBatchId}-${String(idx + 1).padStart(4, "0")}`,
          input.commitBatchId,
          "pending-source",
          obj.recordId,
          obj.objectType,
          obj.objectId,
          input.committedAt
        );
      });
    });
    tx();
  }

  async updateProofSourceFileId(commitBatchId: string, recordId: string, sourceFileId: string): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      UPDATE proof_chain_links
      SET source_file_id = ?
      WHERE commit_batch_id = ? AND record_id = ?
      `
    ).run(sourceFileId, commitBatchId, recordId);
  }

  async listCommits(): Promise<BootstrapCommitSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db.prepare(
      "SELECT commit_batch_id, stage_batch_id, committed_at, committed_count FROM canonical_commit_batches ORDER BY committed_at DESC"
    ).all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      commitBatchId: String(row.commit_batch_id),
      stageBatchId: String(row.stage_batch_id),
      committedAt: String(row.committed_at),
      committedCount: Number(row.committed_count)
    }));
  }

  async getCommit(commitBatchId: string): Promise<BootstrapCommitResult | undefined> {
    const db = await this.sqliteDatabase.open();
    const head = db
      .prepare("SELECT commit_batch_id, stage_batch_id, committed_at, committed_count FROM canonical_commit_batches WHERE commit_batch_id = ?")
      .get(commitBatchId) as Record<string, unknown> | undefined;

    if (!head) {
      return undefined;
    }

    const rows = db.prepare(
      `
      SELECT record_id, record_type, object_type, object_id
      FROM canonical_commit_records
      WHERE commit_batch_id = ?
      ORDER BY rowid ASC
      `
    ).all(commitBatchId) as Array<Record<string, unknown>>;

    const objects = rows.map((row) => ({
      recordId: String(row.record_id),
      recordType: String(row.record_type),
      objectType: String(row.object_type) as BootstrapCommitObject["objectType"],
      objectId: String(row.object_id)
    }));

    return {
      commitBatchId: String(head.commit_batch_id),
      stageBatchId: String(head.stage_batch_id),
      committedAt: String(head.committed_at),
      totalEligible: Number(head.committed_count),
      committedCount: Number(head.committed_count),
      alreadyCommittedCount: 0,
      replayed: false,
      objects
    };
  }

  async insertInvoice(input: {
    invoiceId: string;
    entityId: string;
    supplierName: string;
    grossAmount: number;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const vatAmount = Math.round(input.grossAmount * 0.2 * 100) / 100;
    const netAmount = input.grossAmount - vatAmount;
    db.prepare(
      `
      INSERT INTO invoices(invoice_id, entity_id, supplier_name, gross_amount, net_amount, vat_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(input.invoiceId, input.entityId, input.supplierName, input.grossAmount, netAmount, vatAmount, "unpaid");
  }

  async insertPaymentEvent(input: {
    paymentId: string;
    entityId: string;
    amount: number;
    paymentDate: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO payment_events(payment_id, entity_id, amount, payment_method, payment_date)
      VALUES (?, ?, ?, ?, ?)
      `
    ).run(input.paymentId, input.entityId, input.amount, "manual", input.paymentDate);
  }

  async insertInboxDocument(input: {
    documentId: string;
    fileName: string;
    sourceFileId: string;
    createdAt: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO inbox_items(document_id, file_name, mime_type, source, received_at, status, size_bytes, stored_path, text_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.documentId,
      input.fileName,
      "application/octet-stream",
      "bootstrap-commit",
      input.createdAt,
      "new",
      0,
      input.sourceFileId,
      "Committed from bootstrap pipeline"
    );
  }

  async insertVoucher(input: {
    voucherId: string;
    title: string;
    sourceDocumentId: string;
    sourceFileId: string;
    createdAt: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO vouchers(
        voucher_id, title, verification_status, created_at, source_document_id,
        source_file_name, source_stored_path, source_mime_type, source_received_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.voucherId,
      input.title,
      "half",
      input.createdAt,
      input.sourceDocumentId,
      `${input.sourceDocumentId}.bin`,
      input.sourceFileId,
      "application/octet-stream",
      input.createdAt,
      "Skapad via bootstrap commit"
    );
  }
}
