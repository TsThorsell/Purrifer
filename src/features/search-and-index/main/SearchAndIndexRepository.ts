import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { SearchObjectType, SearchResultItem } from "../contracts";

interface IndexRow {
  objectType: SearchObjectType;
  objectId: string;
  title: string;
  summary: string;
  matchedText: string;
  sortDate?: string;
  targetRoute: SearchResultItem["targetRoute"];
}

export class SearchAndIndexRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async rebuildIndex(indexedAt: string): Promise<number> {
    const db = await this.sqliteDatabase.open();

    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM search_index").run();

      const inboxRows = db
        .prepare(
          `
          SELECT document_id, file_name, source, received_at
          FROM inbox_items
          `
        )
        .all() as Array<Record<string, unknown>>;

      const voucherRows = db
        .prepare(
          `
          SELECT voucher_id, title, verification_status, source_file_name
          FROM vouchers
          `
        )
        .all() as Array<Record<string, unknown>>;

      const invoiceRows = db
        .prepare(
          `
          SELECT invoice_id, supplier_name, status, gross_amount
          FROM invoices
          `
        )
        .all() as Array<Record<string, unknown>>;

      const paymentRows = db
        .prepare(
          `
          SELECT payment_id, payment_method, payment_date, amount
          FROM payment_events
          `
        )
        .all() as Array<Record<string, unknown>>;

      const obligationRows = db
        .prepare(
          `
          SELECT obligation_id, title, status, due_date
          FROM obligations
          `
        )
        .all() as Array<Record<string, unknown>>;

      const caseRows = db
        .prepare(
          `
          SELECT case_id, obligation_id, title, status
          FROM obligation_cases
          `
        )
        .all() as Array<Record<string, unknown>>;

      const insert = db.prepare(
        `
        INSERT INTO search_index (
          object_type, object_id, title, summary, matched_text, target_route, indexed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      );

      for (const row of inboxRows) {
        const receivedAt = String(row.received_at);
        const datePart = receivedAt.slice(0, 10);
        insert.run(
          "document",
          String(row.document_id),
          String(row.file_name),
          `Dokument ${String(row.source)} (${datePart})`,
          `${String(row.file_name)} ${String(row.source)} ${receivedAt}`.toLowerCase(),
          "document-inbox",
          indexedAt
        );
      }

      for (const row of voucherRows) {
        insert.run(
          "voucher",
          String(row.voucher_id),
          String(row.title),
          `Verifikation ${String(row.verification_status)}`,
          `${String(row.title)} ${String(row.source_file_name)} ${String(row.verification_status)}`.toLowerCase(),
          "vouchers",
          indexedAt
        );
      }

      for (const row of invoiceRows) {
        insert.run(
          "supplier-invoice",
          String(row.invoice_id),
          String(row.supplier_name),
          `Faktura ${String(row.status)} (${String(row.gross_amount)})`,
          `${String(row.supplier_name)} ${String(row.status)} ${String(row.gross_amount)} ${String(row.invoice_id)}`.toLowerCase(),
          "invoice-and-payment",
          indexedAt
        );
      }

      for (const row of paymentRows) {
        const paymentDate = String(row.payment_date);
        insert.run(
          "payment-event",
          String(row.payment_id),
          `Betalning ${String(row.payment_method)}`,
          `${String(row.amount)} ${paymentDate}`,
          `${String(row.payment_method)} ${String(row.amount)} ${paymentDate} ${String(row.payment_id)}`.toLowerCase(),
          "invoice-and-payment",
          indexedAt
        );
      }

      for (const row of obligationRows) {
        insert.run(
          "obligation",
          String(row.obligation_id),
          String(row.title),
          `Atagande ${String(row.status)}`,
          `${String(row.title)} ${String(row.status)} ${String(row.due_date ?? "")}`.toLowerCase(),
          "obligations-and-cases",
          indexedAt
        );
      }

      for (const row of caseRows) {
        insert.run(
          "case",
          String(row.case_id),
          String(row.title),
          `Arende ${String(row.status)} (${String(row.obligation_id)})`,
          `${String(row.title)} ${String(row.status)} ${String(row.obligation_id)} ${String(row.case_id)}`.toLowerCase(),
          "obligations-and-cases",
          indexedAt
        );
      }
    });

    transaction();

    const countRow = db.prepare("SELECT COUNT(*) AS count FROM search_index").get() as { count: number };
    return Number(countRow.count ?? 0);
  }

  async searchByQuery(query: string): Promise<SearchResultItem[]> {
    const db = await this.sqliteDatabase.open();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }

    const rows = db
      .prepare(
        `
        SELECT object_type, object_id, title, summary, matched_text, target_route
        FROM search_index
        WHERE matched_text LIKE ? OR title LIKE ? OR summary LIKE ?
        LIMIT 100
        `
      )
      .all(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`) as Array<Record<string, unknown>>;

    const mapped = rows.map((row) => ({
      objectType: row.object_type as SearchObjectType,
      objectId: String(row.object_id),
      title: String(row.title),
      summary: String(row.summary),
      matchedText: String(row.matched_text),
      sortDate: this.extractSortDate(String(row.matched_text)),
      targetRoute: row.target_route as SearchResultItem["targetRoute"]
    }));

    // Basic relevance sort for MVP: exact id/title hits first, then title hits, then generic text hits.
    return mapped.sort((left, right) => {
      const leftScore = this.getRelevanceScore(left, trimmed);
      const rightScore = this.getRelevanceScore(right, trimmed);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return left.title.localeCompare(right.title, "sv");
    });
  }

  private extractSortDate(value: string): string | undefined {
    const match = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
    return match?.[0];
  }

  private getRelevanceScore(item: IndexRow, query: string): number {
    const id = item.objectId.toLowerCase();
    const title = item.title.toLowerCase();
    const summary = item.summary.toLowerCase();
    const text = item.matchedText.toLowerCase();

    if (id === query || title === query) {
      return 300;
    }
    if (id.includes(query) || title.includes(query)) {
      return 200;
    }
    if (summary.includes(query)) {
      return 120;
    }
    if (text.includes(query)) {
      return 100;
    }
    return 0;
  }
}
