import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { documentInboxChannels } from "@features/document-inbox/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "document-inbox",
    namespace: "documentInbox",
    methods: [
      {
        method: "listInboxItems",
        channel: documentInboxChannels.listInboxItems,
        permission: "public"
      },
      {
        method: "getInboxItem",
        channel: documentInboxChannels.getInboxItem,
        permission: "public"
      },
      {
        method: "setInboxItemStatus",
        channel: documentInboxChannels.setInboxItemStatus,
        permission: "restricted"
      },
      {
        method: "selectAndIngestFiles",
        channel: documentInboxChannels.selectAndIngestFiles,
        permission: "restricted"
      },
      {
        method: "ingestDocuments",
        channel: documentInboxChannels.ingestDocuments,
        permission: "restricted"
      },
      {
        method: "ingestClipboardText",
        channel: documentInboxChannels.ingestClipboardText,
        permission: "restricted"
      },
      {
        method: "openStoredDocument",
        channel: documentInboxChannels.openStoredDocument,
        permission: "restricted"
      }
    ]
  };
}
