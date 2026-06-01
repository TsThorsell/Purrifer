import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapPilotDashboardPage } from "./BootstrapPilotDashboardPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-pilot-dashboard",
    render: () => <BootstrapPilotDashboardPage />
  }
];

