import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapReviewPage } from "./BootstrapReviewPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-review",
    render: () => <BootstrapReviewPage />
  }
];

