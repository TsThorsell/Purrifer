import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { InvoiceAndPaymentPage } from "./InvoiceAndPaymentPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "invoice-and-payment",
    render: ({ searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      const initialInvoiceId = searchTarget?.route === "invoice-and-payment" && searchTarget.objectType === "supplier-invoice"
        ? searchTarget.objectId
        : undefined;
      const initialPaymentId = searchTarget?.route === "invoice-and-payment" && searchTarget.objectType === "payment-event"
        ? searchTarget.objectId
        : undefined;
      return (
        <>
          <InvoiceAndPaymentPage
            initialInvoiceId={initialInvoiceId}
            initialPaymentId={initialPaymentId}
          />
          {activeSearchHitBanner("invoice-and-payment")}
        </>
      );
    }
  }
];
