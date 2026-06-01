import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { VoucherAndProofPage } from "./VoucherAndProofPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "vouchers",
    render: ({ searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      const initialVoucherId = searchTarget?.route === "vouchers" ? searchTarget.objectId : undefined;
      return (
        <>
          <VoucherAndProofPage initialVoucherId={initialVoucherId} />
          {activeSearchHitBanner("vouchers")}
        </>
      );
    }
  }
];
