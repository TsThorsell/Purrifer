import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { DocumentReviewPage } from "./DocumentReviewPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "document-review",
    render: () => <DocumentReviewPage />
  }
];

