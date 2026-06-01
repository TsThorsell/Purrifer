import { BrowserWindow } from "electron";
import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { transactionImportChannels } from "@features/transaction-import/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "transaction-import",
    allowedChannels: Object.values(transactionImportChannels),
    handlers: [
      {
        channel: transactionImportChannels.selectAndPreviewImportFile,
        permission: "restricted",
        requiresWindow: true,
        handler: (event) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error("Ingen aktiv applikationsruta hittades för import.");
          }
          return context.transactionImportService.selectAndPreviewImportFile(window);
        }
      },
      {
        channel: transactionImportChannels.listImportBatches,
        permission: "public",
        handler: () => context.transactionImportService.listImportBatches()
      },
      {
        channel: transactionImportChannels.getImportBatch,
        permission: "public",
        handler: (_event, batchId: string) => context.transactionImportService.getImportBatch(batchId)
      },
      {
        channel: transactionImportChannels.getImportReview,
        permission: "public",
        handler: (_event, batchId: string) => context.transactionImportService.getImportReview(batchId)
      },
      {
        channel: transactionImportChannels.saveImportRowMapping,
        permission: "restricted",
        handler: (_event, input) => context.transactionImportService.saveImportRowMapping(input)
      },
      {
        channel: transactionImportChannels.commitImportBatch,
        permission: "restricted",
        handler: (_event, batchId: string) => context.transactionImportService.commitImportBatch(batchId)
      },
      {
        channel: transactionImportChannels.stopImportBatch,
        permission: "restricted",
        handler: (_event, batchId: string, reason?: string) =>
          context.transactionImportService.stopImportBatch(batchId, reason)
      },
      {
        channel: transactionImportChannels.resumeImportBatch,
        permission: "restricted",
        handler: (_event, batchId: string) => context.transactionImportService.resumeImportBatch(batchId)
      }
    ]
  };
}
