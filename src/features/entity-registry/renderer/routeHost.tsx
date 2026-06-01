import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { EntityRegistryPage } from "./EntityRegistryPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "entity-registry",
    render: () => <EntityRegistryPage />
  }
];

