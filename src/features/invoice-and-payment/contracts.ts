export type InvoiceStatus = "unpaid" | "partly-paid" | "paid";
export type PaymentMethod = "bank" | "swish" | "card" | "internal-transfer" | "manual";
export type InvoicePaymentMatchAction =
  | "invoice-created"
  | "payment-created"
  | "match-created"
  | "deviation-acknowledged";
export type InvoiceMatchDeviation = "none" | "underpaid" | "overpaid";

export interface InvoiceListFilter {
  entityId?: string;
  status?: InvoiceStatus;
  query?: string;
}

export interface PaymentListFilter {
  entityId?: string;
}

export interface MatchPaymentInput {
  invoiceId: string;
  paymentId: string;
  amount: number;
  actor?: string;
  note?: string;
}

export interface AcknowledgeDeviationInput {
  invoiceId: string;
  note: string;
  actor?: string;
}

export interface InvoiceMatchHistoryFilter {
  entityId?: string;
  invoiceId?: string;
  paymentId?: string;
  action?: InvoicePaymentMatchAction;
  query?: string;
}

export interface InvoiceSummary {
  invoiceId: string;
  entityId: string;
  supplierName: string;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  status: InvoiceStatus;
  matchedAmount: number;
  outstandingAmount: number;
  deviation: InvoiceMatchDeviation;
  deviationAmount: number;
}

export interface PaymentEventSummary {
  paymentId: string;
  entityId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  allocatedAmount: number;
  unallocatedAmount: number;
  matchedInvoiceCount: number;
}

export interface PaymentMatch {
  matchId: string;
  invoiceId: string;
  paymentId: string;
  amount: number;
  statusAfter: InvoiceStatus;
  invoiceDeviation: InvoiceMatchDeviation;
  invoiceDeviationAmount: number;
}

export interface PaymentMatchHistory {
  historyId: number;
  action: InvoicePaymentMatchAction;
  actor: string;
  entityId: string;
  invoiceId?: string;
  paymentId?: string;
  amount?: number;
  beforeStatus?: InvoiceStatus;
  afterStatus?: InvoiceStatus;
  reasonCode?: string;
  note?: string;
  createdAt: string;
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
  listInvoices(filter?: InvoiceListFilter): Promise<InvoiceSummary[]>;
  listPaymentEvents(filter?: PaymentListFilter): Promise<PaymentEventSummary[]>;
  listInvoicePaymentHistory(filter?: InvoiceMatchHistoryFilter): Promise<PaymentMatchHistory[]>;
  matchPaymentToInvoice(input: MatchPaymentInput): Promise<PaymentMatch>;
  acknowledgeInvoiceDeviation(input: AcknowledgeDeviationInput): Promise<PaymentMatchHistory>;
}

export const invoiceAndPaymentChannels = {
  createInvoiceDraft: "invoice-and-payment:create-invoice-draft",
  createPaymentEvent: "invoice-and-payment:create-payment-event",
  listInvoices: "invoice-and-payment:list-invoices",
  listPaymentEvents: "invoice-and-payment:list-payment-events",
  matchPaymentToInvoice: "invoice-and-payment:match-payment-to-invoice",
  listInvoicePaymentHistory: "invoice-and-payment:list-invoice-payment-history",
  acknowledgeInvoiceDeviation: "invoice-and-payment:acknowledge-invoice-deviation"
} as const;


