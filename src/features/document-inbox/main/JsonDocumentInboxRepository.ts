import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { InboxItemDetails, InboxItemSummary, InboxStatus } from "../contracts";

export class JsonDocumentInboxRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async list(): Promise<InboxItemSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT document_id, file_name, mime_type, source, received_at, status, size_bytes
      FROM inbox_items
      ORDER BY received_at DESC
      `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      documentId: String(row.document_id),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      source: row.source as InboxItemSummary["source"],
      receivedAt: String(row.received_at),
      status: row.status as InboxItemSummary["status"],
      sizeBytes: Number(row.size_bytes)
    }));
  }

  async findById(documentId: string): Promise<InboxItemDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT document_id, file_name, mime_type, source, received_at, status, size_bytes, stored_path, text_preview
      FROM inbox_items
      WHERE document_id = ?
      `
      )
      .get(documentId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      documentId: String(row.document_id),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      source: row.source as InboxItemDetails["source"],
      receivedAt: String(row.received_at),
      status: row.status as InboxItemDetails["status"],
      sizeBytes: Number(row.size_bytes),
      storedPath: String(row.stored_path),
      textPreview: row.text_preview ? String(row.text_preview) : undefined
    };
  }

  async upsert(item: InboxItemDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO inbox_items (
        document_id, file_name, mime_type, source, received_at, status, size_bytes, stored_path, text_preview
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        source = excluded.source,
        received_at = excluded.received_at,
        status = excluded.status,
        size_bytes = excluded.size_bytes,
        stored_path = excluded.stored_path,
        text_preview = excluded.text_preview
      `
    ).run(
      item.documentId,
      item.fileName,
      item.mimeType,
      item.source,
      item.receivedAt,
      item.status,
      item.sizeBytes,
      item.storedPath,
      item.textPreview ?? null
    );
  }

  async updateStatus(documentId: string, status: InboxStatus): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare("UPDATE inbox_items SET status = ? WHERE document_id = ?").run(status, documentId);
  }
}

