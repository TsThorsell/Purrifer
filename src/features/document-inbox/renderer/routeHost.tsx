import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { DocumentInboxPage } from "./DocumentInboxPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "document-inbox",
    render: ({ searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      const initialDocumentId = searchTarget?.route === "document-inbox" ? searchTarget.objectId : undefined;
      return (
        <>
          <DocumentInboxPage initialDocumentId={initialDocumentId} />
          {activeSearchHitBanner("document-inbox")}
        </>
      );
    }
  }
];
