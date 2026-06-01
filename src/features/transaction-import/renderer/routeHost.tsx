import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { TransactionImportPage } from "./TransactionImportPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "transaction-import",
    render: () => <TransactionImportPage />
  }
];

