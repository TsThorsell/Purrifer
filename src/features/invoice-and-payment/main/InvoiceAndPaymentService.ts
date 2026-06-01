import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  AcknowledgeDeviationInput,
  InvoiceListFilter,
  InvoiceMatchDeviation,
  InvoicePaymentMatchAction,
  InvoiceSummary,
  InvoiceMatchHistoryFilter,
  InvoiceStatus,
  MatchPaymentInput,
  PaymentEventSummary,
  PaymentListFilter,
  PaymentMatch,
  PaymentMatchHistory,
  PaymentMethod
} from "../contracts";

type EntityRow = {
  entity_id: string;
};

type InvoiceMatchRow = {
  invoice_id: string;
  entity_id: string;
  supplier_name: string;
  gross_amount: number;
  net_amount: number;
  vat_amount: number;
  status: string;
  matched_amount: number;
  computed_status: string;
};

type PaymentRow = {
  payment_id: string;
  entity_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  allocated_amount: number;
  matched_invoices: number;
};

type MatchHistoryRow = {
  history_id: number;
  action: InvoicePaymentMatchAction;
  actor: string;
  entity_id: string;
  invoice_id: string | null;
  payment_id: string | null;
  amount: number | null;
  before_status: string | null;
  after_status: string | null;
  before_matched_amount: number | null;
  after_matched_amount: number | null;
  reason_code: string | null;
  note: string | null;
  created_at: string;
};

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  "bank",
  "swish",
  "card",
  "internal-transfer",
  "manual"
]);

const DEFAULT_ACTOR = "operator";

function normalizeStatus(rawStatus: string): InvoiceStatus {
  if (rawStatus === "unpaid" || rawStatus === "partly-paid" || rawStatus === "paid") {
    return rawStatus;
  }
  return "unpaid";
}

function normalizeDeviation(value: number): InvoiceMatchDeviation {
  if (value > 0) {
    return "overpaid";
  }
  if (value < 0) {
    return "underpaid";
  }
  return "none";
}

function trimOrEmpty(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export class InvoiceAndPaymentService {
  constructor(
    private readonly sqliteDatabase: SqliteDatabase,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async createInvoiceDraft(input: {
    entityId: string;
    supplierName: string;
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
  }): Promise<InvoiceSummary> {
    const entityId = this.requireEntityId(input.entityId);
    const supplierName = trimOrEmpty(input.supplierName);
    if (!supplierName) {
      throw new AppError({
        code: "BUSINESS_INVOICE_SUPPLIER_REQUIRED",
        message: "Leverantorsnamn krävs.",
        type: "business"
      });
    }

    const grossAmount = this.requirePositiveAmount(input.grossAmount, "grossAmount");
    const netAmount = this.requireNonNegativeAmount(input.netAmount, "netAmount");
    const vatAmount = this.requireNonNegativeAmount(input.vatAmount, "vatAmount");

    if (grossAmount < netAmount + vatAmount) {
      throw new AppError({
        code: "BUSINESS_INVOICE_GROSS_VALIDATION_FAILED",
        message: "Brutto måste vara minst netto + moms.",
        type: "business"
      });
    }

    const db = await this.sqliteDatabase.open();
    await this.ensureEntityExists(db, entityId);

    const invoiceId = await this.sequenceStore.next("I");
    db.prepare(
      "INSERT INTO invoices(invoice_id, entity_id, supplier_name, gross_amount, net_amount, vat_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(invoiceId, entityId, supplierName, grossAmount, netAmount, vatAmount, "unpaid");

    await this.recordActivity(db, {
      action: "invoice-created",
      actor: DEFAULT_ACTOR,
      entityId,
      invoiceId,
      amount: grossAmount,
      afterStatus: "unpaid",
      afterMatchedAmount: 0,
      reasonCode: "INVOICE_CREATED",
      note: `Invoice ${invoiceId} skapad for ${supplierName}.`
    });

    return {
      invoiceId,
      entityId,
      supplierName,
      grossAmount,
      netAmount,
      vatAmount,
      status: "unpaid",
      matchedAmount: 0,
      outstandingAmount: grossAmount,
      deviation: "none",
      deviationAmount: 0
    };
  }

  async createPaymentEvent(input: {
    entityId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
  }): Promise<PaymentEventSummary> {
    const entityId = this.requireEntityId(input.entityId);
    const amount = this.requirePositiveAmount(input.amount, "amount");
    const paymentMethod = trimOrEmpty(input.paymentMethod as string);
    if (!VALID_PAYMENT_METHODS.has(paymentMethod as PaymentMethod)) {
      throw new AppError({
        code: "BUSINESS_PAYMENT_METHOD_INVALID",
        message: `Betalningsmetod ${paymentMethod || "<tom>"} stöds inte.`,
        type: "business"
      });
    }

    const paymentDate = this.normalizeDate(input.paymentDate);
    const db = await this.sqliteDatabase.open();
    await this.ensureEntityExists(db, entityId);

    const paymentId = await this.sequenceStore.next("P");
    db.prepare(
      "INSERT INTO payment_events(payment_id, entity_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?)"
    ).run(paymentId, entityId, amount, paymentMethod, paymentDate);

    await this.recordActivity(db, {
      action: "payment-created",
      actor: DEFAULT_ACTOR,
      entityId,
      paymentId,
      amount,
      reasonCode: "PAYMENT_CREATED",
      note: `Betalning ${paymentId} skapad.`
    });

    return {
      paymentId,
      entityId,
      amount,
      paymentMethod,
      paymentDate,
      allocatedAmount: 0,
      unallocatedAmount: amount,
      matchedInvoiceCount: 0
    };
  }

  async listInvoices(filter: InvoiceListFilter = {}): Promise<InvoiceSummary[]> {
    const db = await this.sqliteDatabase.open();
    const conditions = ["1=1"];
    const params: Array<string | number> = [];

    if (filter.entityId) {
      conditions.push("i.entity_id = ?");
      params.push(this.requireEntityId(filter.entityId));
    }

    if (filter.query) {
      const query = `%${filter.query.toLowerCase()}%`;
      conditions.push(
        "(LOWER(i.invoice_id) LIKE ? OR LOWER(i.supplier_name) LIKE ? OR LOWER(i.entity_id) LIKE ?)"
      );
      params.push(query, query, query);
    }

    const baseSql = `
      SELECT
        i.invoice_id,
        i.entity_id,
        i.supplier_name,
        i.gross_amount,
        i.net_amount,
        i.vat_amount,
        i.status,
        COALESCE(SUM(pm.amount), 0) AS matched_amount,
        CASE
          WHEN COALESCE(SUM(pm.amount), 0) <= 0 THEN 'unpaid'
          WHEN COALESCE(SUM(pm.amount), 0) >= i.gross_amount THEN 'paid'
          ELSE 'partly-paid'
        END AS computed_status
      FROM invoices i
      LEFT JOIN payment_matches pm ON i.invoice_id = pm.invoice_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY i.invoice_id, i.entity_id, i.supplier_name, i.gross_amount, i.net_amount, i.vat_amount, i.status
      ORDER BY i.invoice_id DESC`;

    const rows = db.prepare(baseSql).all(...params) as InvoiceMatchRow[];

    const filteredByStatus = filter.status
      ? rows.filter((row) => row.computed_status === filter.status)
      : rows;

    const summaries: InvoiceSummary[] = filteredByStatus.map((row) =>
      this.toInvoiceSummary(row.invoice_id, row.entity_id, row.supplier_name, row.gross_amount, row.net_amount, row.vat_amount,
        Number(row.matched_amount), row.computed_status)
    );

    for (const summary of summaries) {
      if (summary.status !== (await this.findCurrentInvoiceStatus(db, summary.invoiceId, summary.matchedAmount))) {
        db.prepare("UPDATE invoices SET status = ? WHERE invoice_id = ?").run(summary.status, summary.invoiceId);
      }
    }

    return summaries;
  }

  async listPaymentEvents(filter: PaymentListFilter = {}): Promise<PaymentEventSummary[]> {
    const db = await this.sqliteDatabase.open();
    const conditions = ["1=1"];
    const params: Array<string> = [];

    if (filter.entityId) {
      conditions.push("pe.entity_id = ?");
      params.push(this.requireEntityId(filter.entityId));
    }

    const baseSql = `
      SELECT
        pe.payment_id,
        pe.entity_id,
        pe.amount,
        pe.payment_method,
        pe.payment_date,
        COALESCE(SUM(pm.amount), 0) AS allocated_amount,
        COUNT(DISTINCT pm.invoice_id) AS matched_invoices
      FROM payment_events pe
      LEFT JOIN payment_matches pm ON pe.payment_id = pm.payment_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY pe.payment_id, pe.entity_id, pe.amount, pe.payment_method, pe.payment_date
      ORDER BY pe.payment_id DESC`;

    const rows = db.prepare(baseSql).all(...params) as PaymentRow[];

    return rows.map((row) => {
      const amount = Number(row.amount);
      const allocatedAmount = Number(row.allocated_amount);
      return {
        paymentId: row.payment_id,
        entityId: row.entity_id,
        amount,
        paymentMethod: row.payment_method,
        paymentDate: row.payment_date,
        allocatedAmount,
        unallocatedAmount: amount - allocatedAmount,
        matchedInvoiceCount: Number(row.matched_invoices)
      };
    });
  }

  async listInvoicePaymentHistory(filter: InvoiceMatchHistoryFilter = {}): Promise<PaymentMatchHistory[]> {
    const db = await this.sqliteDatabase.open();

    const conditions = ["1=1"];
    const params: Array<string> = [];

    if (filter.entityId) {
      conditions.push("h.entity_id = ?");
      params.push(this.requireEntityId(filter.entityId));
    }
    if (filter.invoiceId) {
      conditions.push("h.invoice_id = ?");
      params.push(this.requireNonEmpty(filter.invoiceId, "invoiceId"));
    }
    if (filter.paymentId) {
      conditions.push("h.payment_id = ?");
      params.push(this.requireNonEmpty(filter.paymentId, "paymentId"));
    }
    if (filter.action) {
      conditions.push("h.action = ?");
      params.push(filter.action);
    }
    if (filter.query) {
      const query = `%${filter.query.toLowerCase()}%`;
      conditions.push(
        "(LOWER(h.actor) LIKE ? OR LOWER(COALESCE(h.invoice_id, '')) LIKE ? OR LOWER(COALESCE(h.payment_id, '')) LIKE ? OR LOWER(COALESCE(h.reason_code, '')) LIKE ? OR LOWER(COALESCE(h.note, '')) LIKE ?)"
      );
      params.push(query, query, query, query, query);
    }

    const rows = db
      .prepare(
        `
      SELECT
        h.history_id,
        h.action,
        h.actor,
        h.entity_id,
        h.invoice_id,
        h.payment_id,
        h.amount,
        h.before_status,
        h.after_status,
        h.before_matched_amount,
        h.after_matched_amount,
        h.reason_code,
        h.note,
        h.created_at
      FROM invoice_payment_activity_log h
      WHERE ${conditions.join(" AND ")}
      ORDER BY h.created_at DESC, h.history_id DESC
      `
      )
      .all(...params) as MatchHistoryRow[];

    return rows.map((row) => ({
      historyId: row.history_id,
      action: row.action,
      actor: row.actor,
      entityId: row.entity_id,
      invoiceId: row.invoice_id ?? undefined,
      paymentId: row.payment_id ?? undefined,
      amount: row.amount ?? undefined,
      beforeStatus: row.before_status ? normalizeStatus(row.before_status) : undefined,
      afterStatus: row.after_status ? normalizeStatus(row.after_status) : undefined,
      reasonCode: row.reason_code ?? undefined,
      note: row.note ?? undefined,
      createdAt: row.created_at
    }));
  }

  async matchPaymentToInvoice(input: MatchPaymentInput): Promise<PaymentMatch> {
    const invoiceId = this.requireNonEmpty(input.invoiceId, "invoiceId");
    const paymentId = this.requireNonEmpty(input.paymentId, "paymentId");
    const matchAmount = this.requirePositiveAmount(input.amount, "amount");
    const actor = trimOrEmpty(input.actor || "") || DEFAULT_ACTOR;
    const note = trimOrEmpty(input.note);

    const db = await this.sqliteDatabase.open();
    const invoice = db
      .prepare("SELECT invoice_id, entity_id, supplier_name, gross_amount, net_amount, vat_amount, status FROM invoices WHERE invoice_id = ?")
      .get(invoiceId) as {
      invoice_id: string;
      entity_id: string;
      supplier_name: string;
      gross_amount: number;
      net_amount: number;
      vat_amount: number;
      status: string;
    } | undefined;

    if (!invoice) {
      throw new AppError({
        code: "BUSINESS_INVOICE_NOT_FOUND",
        message: `Faktura ${invoiceId} kunde inte hittas.`,
        type: "business"
      });
    }

    const payment = db
      .prepare("SELECT payment_id, entity_id, amount FROM payment_events WHERE payment_id = ?")
      .get(paymentId) as {
      payment_id: string;
      entity_id: string;
      amount: number;
    } | undefined;

    if (!payment) {
      throw new AppError({
        code: "BUSINESS_PAYMENT_NOT_FOUND",
        message: `Betalning ${paymentId} kunde inte hittas.`,
        type: "business"
      });
    }

    if (invoice.entity_id !== payment.entity_id) {
      throw new AppError({
        code: "BUSINESS_PAYMENT_INVOICE_ENTITY_MISMATCH",
        message: "Betalning och faktura måste tillhöra samma entitet.",
        type: "business"
      });
    }

    const invoiceMatchedBefore = this.getMatchedAmount(db, "invoice", invoiceId);
    const paymentAllocatedBefore = this.getMatchedAmount(db, "payment", paymentId);
    const availablePayment = Number(payment.amount) - paymentAllocatedBefore;

    if (matchAmount > availablePayment) {
      throw new AppError({
        code: "BUSINESS_PAYMENT_CAPACITY_EXCEEDED",
        message: "Betalningens outnyttjade belopp räcker inte för matchningen.",
        type: "business"
      });
    }

    const statusBefore = this.calculateStatus(Number(invoice.gross_amount), invoiceMatchedBefore);
    const statusAfter = this.calculateStatus(
      Number(invoice.gross_amount),
      invoiceMatchedBefore + matchAmount
    );

    const matchId = await this.sequenceStore.next("M");
    const now = this.nowProvider().toISOString();

    db.prepare("INSERT INTO payment_matches(match_id, invoice_id, payment_id, amount) VALUES (?, ?, ?, ?)").run(
      matchId,
      invoiceId,
      paymentId,
      matchAmount
    );

    db.prepare("UPDATE invoices SET status = ? WHERE invoice_id = ?").run(statusAfter, invoiceId);

    const invoiceMatchedAfter = this.getMatchedAmount(db, "invoice", invoiceId);
    const deviation = invoiceMatchedAfter - Number(invoice.gross_amount);
    const deviationType = normalizeDeviation(deviation);

    await this.recordActivity(db, {
      action: "match-created",
      actor,
      entityId: invoice.entity_id,
      invoiceId,
      paymentId,
      amount: matchAmount,
      beforeStatus: statusBefore,
      afterStatus: statusAfter,
      beforeMatchedAmount: invoiceMatchedBefore,
      afterMatchedAmount: invoiceMatchedAfter,
      reasonCode:
        deviationType === "overpaid"
          ? "OVERPAYMENT"
          : deviationType === "underpaid"
            ? "UNDERPAYMENT"
            : "MATCH_OK",
      note: note || `Match ${matchId} utförd vid ${now}`
    });

    return {
      matchId,
      invoiceId,
      paymentId,
      amount: matchAmount,
      statusAfter,
      invoiceDeviation: deviationType,
      invoiceDeviationAmount: Math.abs(deviation)
    };
  }

  async acknowledgeInvoiceDeviation(input: AcknowledgeDeviationInput): Promise<PaymentMatchHistory> {
    const invoiceId = this.requireNonEmpty(input.invoiceId, "invoiceId");
    const note = trimOrEmpty(input.note);
    if (!note) {
      throw new AppError({
        code: "BUSINESS_DEVIATION_NOTE_REQUIRED",
        message: "Notering krävs för avvikelsekorrigering.",
        type: "business"
      });
    }

    const invoice = await this.getInvoiceSummary(invoiceId);
    if (invoice.deviation === "none") {
      throw new AppError({
        code: "BUSINESS_INVOICE_NOT_DEVIATED",
        message: `Faktura ${invoiceId} har ingen aktiv avvikelse att bekräfta.`,
        type: "business"
      });
    }

    return this.recordActivity(await this.sqliteDatabase.open(), {
      action: "deviation-acknowledged",
      actor: trimOrEmpty(input.actor) || DEFAULT_ACTOR,
      entityId: invoice.entityId,
      invoiceId,
      amount: invoice.deviationAmount,
      beforeStatus: invoice.status,
      afterStatus: invoice.status,
      reasonCode:
        invoice.deviation === "underpaid" ? "UNDERPAYMENT_REVIEWED" : "OVERPAYMENT_REVIEWED",
      note
    });
  }

  private async getInvoiceSummary(invoiceId: string): Promise<InvoiceSummary> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT
        i.invoice_id,
        i.entity_id,
        i.supplier_name,
        i.gross_amount,
        i.net_amount,
        i.vat_amount,
        COALESCE(SUM(pm.amount), 0) AS matched_amount,
        CASE
          WHEN COALESCE(SUM(pm.amount), 0) <= 0 THEN 'unpaid'
          WHEN COALESCE(SUM(pm.amount), 0) >= i.gross_amount THEN 'paid'
          ELSE 'partly-paid'
        END AS computed_status
      FROM invoices i
      LEFT JOIN payment_matches pm ON i.invoice_id = pm.invoice_id
      WHERE i.invoice_id = ?
      GROUP BY i.invoice_id, i.entity_id, i.supplier_name, i.gross_amount, i.net_amount, i.vat_amount
      `
      )
      .get(invoiceId) as {
      invoice_id: string;
      entity_id: string;
      supplier_name: string;
      gross_amount: number;
      net_amount: number;
      vat_amount: number;
      matched_amount: number;
      computed_status: string;
    } | undefined;

    if (!row) {
      throw new AppError({
        code: "BUSINESS_INVOICE_NOT_FOUND",
        message: `Faktura ${invoiceId} kunde inte hittas.`,
        type: "business"
      });
    }

    return this.toInvoiceSummary(
      row.invoice_id,
      row.entity_id,
      row.supplier_name,
      row.gross_amount,
      row.net_amount,
      row.vat_amount,
      Number(row.matched_amount),
      row.computed_status
    );
  }

  private getMatchedAmount(db: DatabaseWithType, scope: "invoice" | "payment", id: string): number {
    const column = scope === "invoice" ? "invoice_id" : "payment_id";
    const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM payment_matches WHERE ${column} = ?`).get(id) as {
      total: number;
    };
    return Number(row.total);
  }

  private calculateStatus(grossAmount: number, matchedAmount: number): InvoiceStatus {
    if (matchedAmount <= 0) {
      return "unpaid";
    }
    if (matchedAmount >= grossAmount) {
      return "paid";
    }
    return "partly-paid";
  }

  private async findCurrentInvoiceStatus(
    db: DatabaseWithType,
    invoiceId: string,
    matchedAmount: number
  ): Promise<InvoiceStatus> {
    const status = this.calculateStatus(
      Number(
        (db
          .prepare("SELECT gross_amount FROM invoices WHERE invoice_id = ?")
          .get(invoiceId) as { gross_amount: number } | undefined)?.gross_amount
      ),
      matchedAmount
    );
    return status;
  }

  private toInvoiceSummary(
    invoiceId: string,
    entityId: string,
    supplierName: string,
    grossAmount: number,
    netAmount: number,
    vatAmount: number,
    matchedAmount: number,
    computedStatus: string
  ): InvoiceSummary {
    const status = normalizeStatus(computedStatus);
    const deviationAmount = Number(matchedAmount) - Number(grossAmount);
    return {
      invoiceId,
      entityId,
      supplierName,
      grossAmount: Number(grossAmount),
      netAmount: Number(netAmount),
      vatAmount: Number(vatAmount),
      status,
      matchedAmount: Number(matchedAmount),
      outstandingAmount: Math.max(Number(grossAmount) - Number(matchedAmount), 0),
      deviation: normalizeDeviation(deviationAmount),
      deviationAmount: Math.abs(deviationAmount)
    };
  }

  private async ensureEntityExists(db: DatabaseWithType, entityId: string): Promise<void> {
    const entity = db
      .prepare("SELECT entity_id FROM entities WHERE entity_id = ?")
      .get(entityId) as EntityRow | undefined;
    if (!entity) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${entityId} kunde inte hittas.`,
        type: "business"
      });
    }
  }

  private requireEntityId(rawValue: string): string {
    const value = trimOrEmpty(rawValue);
    if (!value) {
      throw new AppError({
        code: "BUSINESS_ENTITY_REQUIRED",
        message: "Entity-id krävs.",
        type: "business"
      });
    }
    return value;
  }

  private requireNonEmpty(rawValue: string, fieldName: string): string {
    const value = trimOrEmpty(rawValue);
    if (!value) {
      throw new AppError({
        code: `BUSINESS_${fieldName.toUpperCase()}_REQUIRED`,
        message: `${fieldName} krävs.`,
        type: "business"
      });
    }
    return value;
  }

  private requirePositiveAmount(rawAmount: number, fieldName: string): number {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError({
        code: `BUSINESS_${fieldName.toUpperCase()}_INVALID`,
        message: `${fieldName} måste vara positivt.`,
        type: "business"
      });
    }
    return amount;
  }

  private requireNonNegativeAmount(rawAmount: number, fieldName: string): number {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new AppError({
        code: `BUSINESS_${fieldName.toUpperCase()}_INVALID`,
        message: `${fieldName} får inte vara negativt.`,
        type: "business"
      });
    }
    return amount;
  }

  private normalizeDate(rawDate: string): string {
    const trimmed = trimOrEmpty(rawDate);
    const isDateLike = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (!isDateLike) {
      throw new AppError({
        code: "BUSINESS_PAYMENT_DATE_INVALID",
        message: "Betalningsdatum måste anges i formatet YYYY-MM-DD.",
        type: "business"
      });
    }
    return trimmed;
  }

  private async recordActivity(
    db: DatabaseWithType,
    payload: {
      action: InvoicePaymentMatchAction;
      actor: string;
      entityId: string;
      invoiceId?: string;
      paymentId?: string;
      amount?: number;
      beforeStatus?: InvoiceStatus;
      afterStatus?: InvoiceStatus;
      beforeMatchedAmount?: number;
      afterMatchedAmount?: number;
      reasonCode?: string;
      note?: string;
    }
  ): Promise<PaymentMatchHistory> {
    const actor = payload.actor?.trim() || DEFAULT_ACTOR;
    const createdAt = this.nowProvider().toISOString();

    const result = db
      .prepare(
        "INSERT INTO invoice_payment_activity_log (action, actor, entity_id, invoice_id, payment_id, amount, before_status, after_status, before_matched_amount, after_matched_amount, reason_code, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        payload.action,
        actor,
        payload.entityId,
        payload.invoiceId ?? null,
        payload.paymentId ?? null,
        payload.amount ?? null,
        payload.beforeStatus ?? null,
        payload.afterStatus ?? null,
        payload.beforeMatchedAmount ?? null,
        payload.afterMatchedAmount ?? null,
        payload.reasonCode ?? null,
        payload.note ?? null,
        createdAt
      );

    return {
      historyId: Number(result.lastInsertRowid),
      action: payload.action,
      actor,
      entityId: payload.entityId,
      invoiceId: payload.invoiceId,
      paymentId: payload.paymentId,
      amount: payload.amount,
      beforeStatus: payload.beforeStatus,
      afterStatus: payload.afterStatus,
      reasonCode: payload.reasonCode,
      note: payload.note,
      createdAt
    };
  }
}

type DatabaseWithType = Awaited<ReturnType<SqliteDatabase["open"]>>;
