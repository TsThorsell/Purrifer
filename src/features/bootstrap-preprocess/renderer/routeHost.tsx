import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { BootstrapPreprocessPage } from "./BootstrapPreprocessPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "bootstrap-preprocess",
    render: () => <BootstrapPreprocessPage />
  }
];

