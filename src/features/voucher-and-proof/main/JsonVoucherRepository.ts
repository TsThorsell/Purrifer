import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { VoucherDetails, VoucherSummary } from "../contracts";

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
}
