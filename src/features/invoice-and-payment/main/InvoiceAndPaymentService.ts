import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  InvoiceSummary,
  PaymentMethod,
  PaymentEventSummary,
  PaymentMatch
} from "../contracts";

export class InvoiceAndPaymentService {
  constructor(
    private readonly sqliteDatabase: SqliteDatabase,
    private readonly sequenceStore: FileSequenceStore
  ) {}

  async createInvoiceDraft(input: {
    entityId: string;
    supplierName: string;
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
  }): Promise<InvoiceSummary> {
    if (!input.supplierName.trim()) {
      throw new AppError({
        code: "BUSINESS_SUPPLIER_REQUIRED",
        message: "Leverantorsnamn kravs.",
        type: "business"
      });
    }
    const invoiceId = await this.sequenceStore.next("I");
    const db = await this.sqliteDatabase.open();
    db.prepare(
      "INSERT INTO invoices(invoice_id, entity_id, supplier_name, gross_amount, net_amount, vat_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      invoiceId,
      input.entityId,
      input.supplierName.trim(),
      input.grossAmount,
      input.netAmount,
      input.vatAmount,
      "unpaid"
    );
    return {
      invoiceId,
      entityId: input.entityId,
      supplierName: input.supplierName.trim(),
      grossAmount: input.grossAmount,
      netAmount: input.netAmount,
      vatAmount: input.vatAmount,
      status: "unpaid"
    };
  }

  async createPaymentEvent(input: {
    entityId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
  }): Promise<PaymentEventSummary> {
    const paymentId = await this.sequenceStore.next("P");
    const db = await this.sqliteDatabase.open();
    db.prepare(
      "INSERT INTO payment_events(payment_id, entity_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?)"
    ).run(paymentId, input.entityId, input.amount, input.paymentMethod, input.paymentDate);
    return {
      paymentId,
      entityId: input.entityId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: input.paymentDate
    };
  }

  async listInvoices(): Promise<InvoiceSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        "SELECT invoice_id, entity_id, supplier_name, gross_amount, net_amount, vat_amount, status FROM invoices ORDER BY invoice_id DESC"
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      invoiceId: String(row.invoice_id),
      entityId: String(row.entity_id),
      supplierName: String(row.supplier_name),
      grossAmount: Number(row.gross_amount),
      netAmount: Number(row.net_amount),
      vatAmount: Number(row.vat_amount),
      status: row.status as InvoiceSummary["status"]
    }));
  }

  async listPaymentEvents(): Promise<PaymentEventSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        "SELECT payment_id, entity_id, amount, payment_method, payment_date FROM payment_events ORDER BY payment_id DESC"
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      paymentId: String(row.payment_id),
      entityId: String(row.entity_id),
      amount: Number(row.amount),
      paymentMethod: row.payment_method as PaymentEventSummary["paymentMethod"],
      paymentDate: String(row.payment_date)
    }));
  }

  async matchPaymentToInvoice(invoiceId: string, paymentId: string, amount: number): Promise<PaymentMatch> {
    const db = await this.sqliteDatabase.open();
    const matchId = await this.sequenceStore.next("M");
    db.prepare("INSERT INTO payment_matches(match_id, invoice_id, payment_id, amount) VALUES (?, ?, ?, ?)").run(
      matchId,
      invoiceId,
      paymentId,
      amount
    );

    const paidRow = db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS paid FROM payment_matches WHERE invoice_id = ?")
      .get(invoiceId) as { paid: number };
    const invoice = db
      .prepare("SELECT gross_amount FROM invoices WHERE invoice_id = ?")
      .get(invoiceId) as { gross_amount: number } | undefined;
    if (!invoice) {
      throw new AppError({
        code: "BUSINESS_INVOICE_NOT_FOUND",
        message: `Faktura ${invoiceId} kunde inte hittas.`,
        type: "business"
      });
    }
    const status = paidRow.paid <= 0 ? "unpaid" : paidRow.paid >= invoice.gross_amount ? "paid" : "partly-paid";
    db.prepare("UPDATE invoices SET status = ? WHERE invoice_id = ?").run(status, invoiceId);
    return { matchId, invoiceId, paymentId, amount };
  }
}
