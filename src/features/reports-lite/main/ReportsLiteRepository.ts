import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { EntityLedgerEntry } from "../contracts";

export interface CategoryAmountRow {
  categoryKey: string;
  amount: number;
  sourceCount: number;
}

const STANDARD_BUDGET_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "insurance", label: "Forsakring" },
  { key: "drift-energi", label: "Drift och energi" },
  { key: "lokal-hyra", label: "Lokal och hyra" },
  { key: "ovrigt", label: "Ovriga kostnader" }
];

export class ReportsLiteRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async listEntityLedger(entityId: string, fromDate?: string, toDate?: string): Promise<EntityLedgerEntry[]> {
    const db = await this.sqliteDatabase.open();

    const invoiceRows = db
      .prepare(
        `
        SELECT invoice_id, gross_amount
        FROM invoices
        WHERE entity_id = ?
        ORDER BY invoice_id ASC
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const paymentRows = db
      .prepare(
        `
        SELECT payment_id, amount, payment_date
        FROM payment_events
        WHERE entity_id = ?
        ORDER BY payment_date DESC
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const matchRows = db
      .prepare(
        `
        SELECT pm.match_id, pm.invoice_id, pm.payment_id, pm.amount, pe.payment_date
        FROM payment_matches pm
        INNER JOIN invoices i ON i.invoice_id = pm.invoice_id
        INNER JOIN payment_events pe ON pe.payment_id = pm.payment_id
        WHERE i.entity_id = ?
        ORDER BY pe.payment_date DESC
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const invoices: EntityLedgerEntry[] = invoiceRows.map((row) => ({
      date: "1970-01-01",
      entryType: "invoice",
      referenceId: String(row.invoice_id),
      amount: -Math.abs(Number(row.gross_amount)),
      source: "invoice-and-payment",
      drilldownRoute: "invoice-and-payment",
      drilldownObjectType: "supplier-invoice",
      drilldownObjectId: String(row.invoice_id)
    }));

    const payments: EntityLedgerEntry[] = paymentRows.map((row) => ({
      date: String(row.payment_date),
      entryType: "payment",
      referenceId: String(row.payment_id),
      amount: Math.abs(Number(row.amount)),
      source: "invoice-and-payment",
      drilldownRoute: "invoice-and-payment",
      drilldownObjectType: "payment-event",
      drilldownObjectId: String(row.payment_id)
    }));

    const matches: EntityLedgerEntry[] = matchRows.map((row) => ({
      date: String(row.payment_date),
      entryType: "payment-match",
      referenceId: String(row.match_id),
      amount: Number(row.amount),
      source: "invoice-and-payment",
      drilldownRoute: "invoice-and-payment",
      drilldownObjectType: "payment-event",
      drilldownObjectId: String(row.payment_id)
    }));

    const filtered = [...payments, ...matches, ...invoices].filter((entry) => {
      if (fromDate && entry.date < fromDate) {
        return false;
      }
      if (toDate && entry.date > toDate) {
        return false;
      }
      return true;
    });

    filtered.sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }
      return left.referenceId.localeCompare(right.referenceId, "sv");
    });

    return filtered;
  }

  async getBalanceSourceRows(entityId: string): Promise<{
    invoiceTotals: { gross: number; open: number };
    paymentTotal: number;
  }> {
    const db = await this.sqliteDatabase.open();

    const invoiceRows = db
      .prepare(
        `
        SELECT gross_amount, status
        FROM invoices
        WHERE entity_id = ?
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const paymentRows = db
      .prepare(
        `
        SELECT amount
        FROM payment_events
        WHERE entity_id = ?
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const gross = invoiceRows.reduce((acc, row) => acc + Number(row.gross_amount), 0);
    const open = invoiceRows
      .filter((row) => String(row.status) !== "paid")
      .reduce((acc, row) => acc + Number(row.gross_amount), 0);
    const paymentTotal = paymentRows.reduce((acc, row) => acc + Number(row.amount), 0);

    return {
      invoiceTotals: { gross, open },
      paymentTotal
    };
  }

  async listBudgetRows(entityId: string, year: number, month?: number): Promise<Array<{ categoryKey: string; categoryLabel: string; budgetAmount: number }>> {
    const db = await this.sqliteDatabase.open();
    this.ensureBudgetSeed(db, entityId, year, month);
    const rows = (month
      ? db
          .prepare(
            `
            SELECT category_key, category_label, budget_amount
            FROM reports_budgets
            WHERE entity_id = ? AND year = ? AND month = ?
            ORDER BY category_key ASC
            `
          )
          .all(entityId, year, month)
      : db
          .prepare(
            `
            SELECT category_key, category_label, budget_amount
            FROM reports_budgets
            WHERE entity_id = ? AND year = ?
            ORDER BY category_key ASC
            `
          )
          .all(entityId, year)) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      categoryKey: String(row.category_key),
      categoryLabel: String(row.category_label),
      budgetAmount: Number(row.budget_amount)
    }));
  }

  async listActualCategoryAmounts(entityId: string, year: number, month?: number): Promise<CategoryAmountRow[]> {
    const db = await this.sqliteDatabase.open();

    const yearPattern = `${String(year)}-%`;
    const monthPattern = month ? `${String(year)}-${String(month).padStart(2, "0")}%` : yearPattern;

    const invoiceRows = db
      .prepare(
        `
        SELECT supplier_name, gross_amount
        FROM invoices
        WHERE entity_id = ?
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    const paymentRows = db
      .prepare(
        `
        SELECT payment_method, amount, payment_date
        FROM payment_events
        WHERE entity_id = ? AND payment_date LIKE ?
        `
      )
      .all(entityId, monthPattern) as Array<Record<string, unknown>>;

    const categoryMap = new Map<string, { label: string; amount: number; sourceCount: number }>();

    for (const row of invoiceRows) {
      const category = this.classifyInvoiceSupplier(String(row.supplier_name));
      const existing = categoryMap.get(category.key) ?? { label: category.label, amount: 0, sourceCount: 0 };
      existing.amount += -Math.abs(Number(row.gross_amount));
      existing.sourceCount += 1;
      categoryMap.set(category.key, existing);
    }

    for (const row of paymentRows) {
      const key = `payment-${String(row.payment_method)}`;
      const label = `Betalning ${String(row.payment_method)}`;
      const existing = categoryMap.get(key) ?? { label, amount: 0, sourceCount: 0 };
      existing.amount += Math.abs(Number(row.amount));
      existing.sourceCount += 1;
      categoryMap.set(key, existing);
    }

    return [...categoryMap.entries()].map(([categoryKey, value]) => ({
      categoryKey,
      amount: value.amount,
      sourceCount: value.sourceCount
    }));
  }

  private classifyInvoiceSupplier(supplierName: string): { key: string; label: string } {
    const name = supplierName.toLowerCase();
    if (name.includes("forsak") || name.includes("insurance")) {
      return { key: "insurance", label: "Forsakring" };
    }
    if (name.includes("el") || name.includes("energi") || name.includes("vatten") || name.includes("varme")) {
      return { key: "drift-energi", label: "Drift och energi" };
    }
    if (name.includes("hyra") || name.includes("rent")) {
      return { key: "lokal-hyra", label: "Lokal och hyra" };
    }
    return { key: "ovrigt", label: "Ovriga kostnader" };
  }

  private ensureBudgetSeed(
    db: Awaited<ReturnType<SqliteDatabase["open"]>>,
    entityId: string,
    year: number,
    month?: number
  ): void {
    const existingCount = Number(
      (
        (month
          ? db
              .prepare(
                `
                SELECT COUNT(*) AS count
                FROM reports_budgets
                WHERE entity_id = ? AND year = ? AND month = ?
                `
              )
              .get(entityId, year, month)
          : db
              .prepare(
                `
                SELECT COUNT(*) AS count
                FROM reports_budgets
                WHERE entity_id = ? AND year = ? AND month IS NULL
                `
              )
              .get(entityId, year)) as { count: number }
      ).count ?? 0
    );

    if (existingCount > 0) {
      return;
    }

    const now = new Date().toISOString();
    const insert = db.prepare(
      `
      INSERT OR IGNORE INTO reports_budgets (
        budget_id, entity_id, year, month, category_key, category_label, budget_amount, confidence, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const category of STANDARD_BUDGET_CATEGORIES) {
      const periodPart = month ? `M${String(month).padStart(2, "0")}` : "Y";
      insert.run(
        `B-${entityId}-${year}-${periodPart}-${category.key}`,
        entityId,
        year,
        month ?? null,
        category.key,
        category.label,
        0,
        "partial",
        now
      );
    }
  }
}
