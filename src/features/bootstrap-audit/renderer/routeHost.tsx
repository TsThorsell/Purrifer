import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapAuditPage } from "./BootstrapAuditPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-audit",
    render: () => <BootstrapAuditPage />
  }
];

