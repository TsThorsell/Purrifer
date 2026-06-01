import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { HoldingsAndEventsPage } from "./HoldingsAndEventsPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "holdings-and-events",
    render: () => <HoldingsAndEventsPage />
  }
];

