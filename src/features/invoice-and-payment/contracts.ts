export type InvoiceStatus = "unpaid" | "partly-paid" | "paid";
export type PaymentMethod = "bank" | "swish" | "card" | "internal-transfer" | "manual";

export interface InvoiceSummary {
  invoiceId: string;
  entityId: string;
  supplierName: string;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  status: InvoiceStatus;
}

export interface PaymentEventSummary {
  paymentId: string;
  entityId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
}

export interface PaymentMatch {
  matchId: string;
  invoiceId: string;
  paymentId: string;
  amount: number;
}

export interface InvoiceAndPaymentApi {
  createInvoiceDraft(input: {
    entityId: string;
    supplierName: string;
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
  }): Promise<InvoiceSummary>;
  createPaymentEvent(input: {
    entityId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
  }): Promise<PaymentEventSummary>;
  listInvoices(): Promise<InvoiceSummary[]>;
  listPaymentEvents(): Promise<PaymentEventSummary[]>;
  matchPaymentToInvoice(invoiceId: string, paymentId: string, amount: number): Promise<PaymentMatch>;
}

export const invoiceAndPaymentChannels = {
  createInvoiceDraft: "invoice-and-payment:create-invoice-draft",
  createPaymentEvent: "invoice-and-payment:create-payment-event",
  listInvoices: "invoice-and-payment:list-invoices",
  listPaymentEvents: "invoice-and-payment:list-payment-events",
  matchPaymentToInvoice: "invoice-and-payment:match-payment-to-invoice"
} as const;

