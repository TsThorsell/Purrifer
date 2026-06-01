import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { invoiceAndPaymentChannels } from "@features/invoice-and-payment/contracts";
import type { PaymentMethod } from "@features/invoice-and-payment/contracts";
import type {
  InvoiceListFilter,
  MatchPaymentInput,
  PaymentListFilter,
  InvoiceMatchHistoryFilter,
  AcknowledgeDeviationInput
} from "@features/invoice-and-payment/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "invoice-and-payment",
    allowedChannels: Object.values(invoiceAndPaymentChannels),
    handlers: [
      {
        channel: invoiceAndPaymentChannels.createInvoiceDraft,
        permission: "restricted",
        handler: (_event, input: {
          entityId: string;
          supplierName: string;
          grossAmount: number;
          netAmount: number;
          vatAmount: number;
        }) => context.invoiceAndPaymentService.createInvoiceDraft(input)
      },
      {
        channel: invoiceAndPaymentChannels.createPaymentEvent,
        permission: "restricted",
        handler: (_event, input: {
          entityId: string;
          amount: number;
          paymentMethod: PaymentMethod;
          paymentDate: string;
        }) => context.invoiceAndPaymentService.createPaymentEvent(input)
      },
      {
        channel: invoiceAndPaymentChannels.listInvoices,
        permission: "public",
        handler: (_event, rawFilter) =>
          context.invoiceAndPaymentService.listInvoices((rawFilter ?? undefined) as InvoiceListFilter | undefined)
      },
      {
        channel: invoiceAndPaymentChannels.listPaymentEvents,
        permission: "public",
        handler: (_event, rawFilter) =>
          context.invoiceAndPaymentService.listPaymentEvents((rawFilter ?? undefined) as PaymentListFilter | undefined)
      },
      {
        channel: invoiceAndPaymentChannels.matchPaymentToInvoice,
        permission: "restricted",
        handler: (_event, rawInput) =>
          context.invoiceAndPaymentService.matchPaymentToInvoice(rawInput as MatchPaymentInput)
      },
      {
        channel: invoiceAndPaymentChannels.listInvoicePaymentHistory,
        permission: "public",
        handler: (_event, rawFilter) =>
          context.invoiceAndPaymentService.listInvoicePaymentHistory((rawFilter ?? undefined) as InvoiceMatchHistoryFilter | undefined)
      },
      {
        channel: invoiceAndPaymentChannels.acknowledgeInvoiceDeviation,
        permission: "restricted",
        handler: (_event, rawInput) =>
          context.invoiceAndPaymentService.acknowledgeInvoiceDeviation(rawInput as AcknowledgeDeviationInput)
      }
    ]
  };
}
