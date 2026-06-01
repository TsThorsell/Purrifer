import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { SearchAndIndexPage } from "./SearchAndIndexPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "search",
    render: ({ onSearchTarget }) => <SearchAndIndexPage onOpenTarget={onSearchTarget} />
  }
];

