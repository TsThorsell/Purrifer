import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { ReportsLitePage } from "./ReportsLitePage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "reports-lite",
    render: ({ onSearchTarget, searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      return (
        <>
          {activeSearchHitBanner("reports-lite")}
          <ReportsLitePage onDrilldown={onSearchTarget} />
        </>
      );
    }
  }
];
