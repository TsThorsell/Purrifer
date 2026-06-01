import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapStagePage } from "./BootstrapStagePage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-stage",
    render: () => <BootstrapStagePage />
  }
];

