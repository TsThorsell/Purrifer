import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapIntakePage } from "./BootstrapIntakePage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-intake",
    render: () => <BootstrapIntakePage />
  }
];

