import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapCommitPage } from "./BootstrapCommitPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-commit",
    render: () => <BootstrapCommitPage />
  }
];

