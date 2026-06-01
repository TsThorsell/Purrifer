import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { RetirementBaselinePage } from "./RetirementBaselinePage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "retirement-baseline",
    render: ({ searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      return (
        <>
          <RetirementBaselinePage />
          {activeSearchHitBanner("retirement-baseline")}
        </>
      );
    }
  }
];
