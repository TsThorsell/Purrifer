import { BrowserWindow } from "electron";
import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { documentInboxChannels } from "@features/document-inbox/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "document-inbox",
    allowedChannels: Object.values(documentInboxChannels),
    handlers: [
      {
        channel: documentInboxChannels.listInboxItems,
        permission: "public",
        handler: () => context.documentInboxService.listInboxItems()
      },
      {
        channel: documentInboxChannels.getInboxItem,
        permission: "public",
        handler: (_event, documentId: string) => context.documentInboxService.getInboxItem(documentId)
      },
      {
        channel: documentInboxChannels.setInboxItemStatus,
        permission: "restricted",
        handler: (_event, input) => context.documentInboxService.setInboxItemStatus(input.documentId, input.status)
      },
      {
        channel: documentInboxChannels.selectAndIngestFiles,
        permission: "restricted",
        requiresWindow: true,
        handler: (event) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error("Ingen aktiv applikationsruta hittades för filval.");
          }
          return context.documentInboxService.selectAndIngestFiles(window);
        }
      },
      {
        channel: documentInboxChannels.ingestDocuments,
        permission: "restricted",
        handler: (_event, payloads) => context.documentInboxService.ingestDocuments(payloads)
      },
      {
        channel: documentInboxChannels.ingestClipboardText,
        permission: "restricted",
        handler: (_event, text: string) => context.documentInboxService.ingestClipboardText(text)
      },
      {
        channel: documentInboxChannels.openStoredDocument,
        permission: "restricted",
        handler: (_event, documentId: string) => context.documentInboxService.openStoredDocument(documentId)
      }
    ]
  };
}
