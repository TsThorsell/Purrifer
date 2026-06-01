import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  VoucherDocumentRelation,
  VoucherProofChainLink,
  VoucherRelationType,
  VoucherStatusHistoryEntry,
  VoucherDetails,
  VoucherSummary
} from "../contracts";

type RelationRow = {
  voucher_id: string;
  document_id: string;
  file_name: string | null;
  relation_type: string;
  linked_by: string;
  linked_at: string;
};

type StatusHistoryRow = {
  history_id: number;
  voucher_id: string;
  previous_status: string | null;
  new_status: string;
  reason_code: string | null;
  actor: string;
  changed_at: string;
};

export class JsonVoucherRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async list(): Promise<VoucherSummary[]> {
    const details = await this.listDetails();
    return details.map((voucher) => ({
      voucherId: voucher.voucherId,
      title: voucher.title,
      verificationStatus: voucher.verificationStatus,
      createdAt: voucher.createdAt,
      sourceDocumentId: voucher.sourceDocumentId,
      sourceFileName: voucher.sourceFileName
    }));
  }

  async listDocumentRelations(voucherId: string): Promise<VoucherDocumentRelation[]> {
    const rows = await this.readRelations(voucherId);
    return rows.map((row) => this.mapRelationRow(row));
  }

  async listAllDocumentRelations(): Promise<VoucherDocumentRelation[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        vdr.voucher_id,
        vdr.document_id,
        i.file_name,
        vdr.relation_type,
        vdr.linked_by,
        vdr.linked_at
      FROM voucher_document_relations vdr
      LEFT JOIN inbox_items i ON i.document_id = vdr.document_id
      ORDER BY vdr.linked_at DESC
      `
      )
      .all() as Array<RelationRow>;

    return rows.map((row) => this.mapRelationRow(row));
  }

  async listDetails(): Promise<VoucherDetails[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        voucher_id, title, verification_status, created_at, source_document_id, source_file_name,
        source_stored_path, source_mime_type, source_received_at, notes
      FROM vouchers
      ORDER BY created_at DESC
    `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      voucherId: String(row.voucher_id),
      title: String(row.title),
      verificationStatus: row.verification_status as VoucherDetails["verificationStatus"],
      createdAt: String(row.created_at),
      sourceDocumentId: String(row.source_document_id),
      sourceFileName: String(row.source_file_name),
      sourceStoredPath: String(row.source_stored_path),
      sourceMimeType: String(row.source_mime_type),
      sourceReceivedAt: String(row.source_received_at),
      notes: row.notes ? String(row.notes) : undefined
    }));
  }

  async findById(voucherId: string): Promise<VoucherDetails | undefined> {
    const details = await this.listDetails();
    return details.find((voucher) => voucher.voucherId === voucherId);
  }

  async findBySourceDocumentId(documentId: string): Promise<VoucherDetails | undefined> {
    const details = await this.listDetails();
    return details.find((voucher) => voucher.sourceDocumentId === documentId);
  }

  async upsert(voucher: VoucherDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO vouchers (
        voucher_id, title, verification_status, created_at, source_document_id, source_file_name,
        source_stored_path, source_mime_type, source_received_at, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(voucher_id) DO UPDATE SET
        title = excluded.title,
        verification_status = excluded.verification_status,
        created_at = excluded.created_at,
        source_document_id = excluded.source_document_id,
        source_file_name = excluded.source_file_name,
        source_stored_path = excluded.source_stored_path,
        source_mime_type = excluded.source_mime_type,
        source_received_at = excluded.source_received_at,
        notes = excluded.notes
      `
    ).run(
      voucher.voucherId,
      voucher.title,
      voucher.verificationStatus,
      voucher.createdAt,
      voucher.sourceDocumentId,
      voucher.sourceFileName,
      voucher.sourceStoredPath,
      voucher.sourceMimeType,
      voucher.sourceReceivedAt,
      voucher.notes ?? null
    );
  }

  async upsertDocumentRelation(
    voucherId: string,
    documentId: string,
    relationType: VoucherRelationType,
    linkedBy = "operator",
    linkedAt = new Date().toISOString()
  ): Promise<VoucherDocumentRelation> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO voucher_document_relations (voucher_id, document_id, relation_type, linked_by, linked_at)
      VALUES (?, ?, ?, ?, ?)
      `
    ).run(voucherId, documentId, relationType, linkedBy, linkedAt);

    return {
      voucherId,
      documentId,
      documentFileName: await this.getDocumentFileName(documentId),
      relationType,
      linkedBy,
      linkedAt
    };
  }

  async findPrimaryRelationForVoucher(voucherId: string): Promise<VoucherDocumentRelation | undefined> {
    const rows = await this.readRelations(voucherId, "primary-source");
    return rows.length > 0 ? this.mapRelationRow(rows[0]) : undefined;
  }

  async findPrimaryRelationForDocument(documentId: string): Promise<VoucherDocumentRelation | undefined> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        vdr.voucher_id,
        vdr.document_id,
        i.file_name,
        vdr.relation_type,
        vdr.linked_by,
        vdr.linked_at
      FROM voucher_document_relations vdr
      LEFT JOIN inbox_items i ON i.document_id = vdr.document_id
      WHERE vdr.document_id = ? AND vdr.relation_type = 'primary-source'
      ORDER BY vdr.linked_at DESC
      LIMIT 1
      `
      )
      .all(documentId) as Array<RelationRow>;

    return rows.length > 0 ? this.mapRelationRow(rows[0]) : undefined;
  }

  async findRelation(
    voucherId: string,
    documentId: string,
    relationType: VoucherRelationType
  ): Promise<VoucherDocumentRelation | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT
        vdr.voucher_id,
        vdr.document_id,
        i.file_name,
        vdr.relation_type,
        vdr.linked_by,
        vdr.linked_at
      FROM voucher_document_relations vdr
      LEFT JOIN inbox_items i ON i.document_id = vdr.document_id
      WHERE vdr.voucher_id = ? AND vdr.document_id = ? AND vdr.relation_type = ?
      LIMIT 1
      `
      )
      .get(voucherId, documentId, relationType) as RelationRow | undefined;

    if (!row) {
      return undefined;
    }

    return this.mapRelationRow(row);
  }

  async listVoucherProofChain(voucherId: string): Promise<VoucherProofChainLink[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        p.commit_batch_id,
        p.record_id,
        p.record_type,
        p.source_file_id,
        p.object_type,
        p.object_id,
        sb.created_at AS stage_created_at,
        cb.committed_at,
        cr.stage_batch_id,
        sr.status AS stage_status,
        ra.action_status AS review_action_status,
        ra.review_note,
        ra.created_at AS review_at
      FROM proof_chain_links p
      JOIN canonical_commit_batches cb ON cb.commit_batch_id = p.commit_batch_id
      JOIN canonical_commit_records cr ON cr.commit_batch_id = p.commit_batch_id AND cr.record_id = p.record_id
      JOIN canonical_stage_records sr ON sr.record_id = cr.record_id AND sr.stage_batch_id = cr.stage_batch_id
      JOIN canonical_stage_batches sb ON sb.stage_batch_id = cr.stage_batch_id
      LEFT JOIN canonical_stage_review_actions ra ON ra.stage_batch_id = sr.stage_batch_id AND ra.record_id = sr.record_id
      WHERE p.object_type = 'Verifikat' AND p.object_id = ?
      ORDER BY cb.committed_at DESC, p.record_id ASC
      `
      )
      .all(voucherId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      commitBatchId: String(row.commit_batch_id),
      recordId: String(row.record_id),
      recordType: String(row.record_type),
      sourceFileId: row.source_file_id ? String(row.source_file_id) : `manual-${String(voucherId)}`,
      stageStatus: row.stage_status ? String(row.stage_status) : "unknown",
      stageCreatedAt: row.stage_created_at ? String(row.stage_created_at) : String(row.committed_at),
      reviewActionStatus: row.review_action_status ? String(row.review_action_status) : undefined,
      reviewNote: row.review_note ? String(row.review_note) : undefined,
      reviewAt: row.review_at ? String(row.review_at) : undefined,
      committedAt: String(row.committed_at),
      objectType: String(row.object_type),
      objectId: String(row.object_id)
    }));
  }

  async insertStatusHistory(
    voucherId: string,
    previousStatus: string | null,
    newStatus: string,
    actor: string,
    changedAt = new Date().toISOString(),
    reasonCode?: string
  ): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO voucher_status_history (
        voucher_id, previous_status, new_status, actor, reason_code, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(voucherId, previousStatus, newStatus, actor, reasonCode ?? null, changedAt);
  }

  async listStatusHistory(voucherId: string): Promise<VoucherStatusHistoryEntry[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        history_id,
        voucher_id,
        previous_status,
        new_status,
        reason_code,
        actor,
        changed_at
      FROM voucher_status_history
      WHERE voucher_id = ?
      ORDER BY changed_at DESC, history_id DESC
      `
      )
      .all(voucherId) as Array<StatusHistoryRow>;

    return rows.map((row) => ({
      historyId: Number(row.history_id),
      voucherId: String(row.voucher_id),
      previousStatus: row.previous_status
        ? (String(row.previous_status) as VoucherStatusHistoryEntry["previousStatus"])
        : null,
      newStatus: String(row.new_status) as VoucherDetails["verificationStatus"],
      reasonCode: row.reason_code ?? undefined,
      actor: String(row.actor),
      changedAt: String(row.changed_at)
    }));
  }

  private async readRelations(voucherId: string, relationType?: VoucherRelationType): Promise<RelationRow[]> {
    const db = await this.sqliteDatabase.open();
    const relationCondition = relationType ? " AND vdr.relation_type = ?" : "";
    const params: string[] = [voucherId];
    if (relationType) {
      params.push(relationType);
    }

    const rows = db
      .prepare(
        `
      SELECT
        vdr.voucher_id,
        vdr.document_id,
        i.file_name,
        vdr.relation_type,
        vdr.linked_by,
        vdr.linked_at
      FROM voucher_document_relations vdr
      LEFT JOIN inbox_items i ON i.document_id = vdr.document_id
      WHERE vdr.voucher_id = ?${relationCondition}
      ORDER BY vdr.linked_at DESC, vdr.relation_type ASC
      `
      )
      .all(...params) as Array<RelationRow>;

    return rows;
  }

  private mapRelationRow(row: RelationRow): VoucherDocumentRelation {
    return {
      voucherId: String(row.voucher_id),
      documentId: String(row.document_id),
      documentFileName: row.file_name ?? row.document_id,
      relationType: String(row.relation_type) as VoucherRelationType,
      linkedBy: String(row.linked_by),
      linkedAt: String(row.linked_at)
    };
  }

  private async getDocumentFileName(documentId: string): Promise<string> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT file_name FROM inbox_items WHERE document_id = ?")
      .get(documentId) as { file_name: string } | undefined;

    return row?.file_name ? String(row.file_name) : documentId;
  }
}
