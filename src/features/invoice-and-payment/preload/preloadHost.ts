import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { invoiceAndPaymentChannels } from "@features/invoice-and-payment/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "invoice-and-payment",
    namespace: "invoiceAndPayment",
    methods: [
      {
        method: "createInvoiceDraft",
        channel: invoiceAndPaymentChannels.createInvoiceDraft,
        permission: "restricted"
      },
      {
        method: "createPaymentEvent",
        channel: invoiceAndPaymentChannels.createPaymentEvent,
        permission: "restricted"
      },
      {
        method: "listInvoices",
        channel: invoiceAndPaymentChannels.listInvoices,
        permission: "public"
      },
      {
        method: "listPaymentEvents",
        channel: invoiceAndPaymentChannels.listPaymentEvents,
        permission: "public"
      },
      {
        method: "matchPaymentToInvoice",
        channel: invoiceAndPaymentChannels.matchPaymentToInvoice,
        permission: "restricted"
      },
      {
        method: "listInvoicePaymentHistory",
        channel: invoiceAndPaymentChannels.listInvoicePaymentHistory,
        permission: "public"
      },
      {
        method: "acknowledgeInvoiceDeviation",
        channel: invoiceAndPaymentChannels.acknowledgeInvoiceDeviation,
        permission: "restricted"
      }
    ]
  };
}
