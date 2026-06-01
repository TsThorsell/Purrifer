import { BrowserWindow } from "electron";
import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapIntakeChannels } from "@features/bootstrap-intake/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-intake",
    allowedChannels: Object.values(bootstrapIntakeChannels),
    handlers: [
      {
        channel: bootstrapIntakeChannels.selectFoldersAndIngest,
        permission: "restricted",
        requiresWindow: true,
        handler: (event, input) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error("Ingen aktiv applikationsruta hittades för batchingest.");
          }
          return context.bootstrapIntakeService.selectFoldersAndIngest(window, input);
        }
      },
      {
        channel: bootstrapIntakeChannels.getScannerCapabilities,
        permission: "public",
        handler: () => context.bootstrapIntakeService.getScannerCapabilities()
      },
      {
        channel: bootstrapIntakeChannels.scanToBatch,
        permission: "restricted",
        requiresWindow: true,
        handler: (event, input) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error("Ingen aktiv applikationsruta hittades för scanning.");
          }
          return context.bootstrapIntakeService.scanToBatch(window, input);
        }
      },
      {
        channel: bootstrapIntakeChannels.listBatches,
        permission: "public",
        handler: () => context.bootstrapIntakeService.listBatches()
      },
      {
        channel: bootstrapIntakeChannels.getBatch,
        permission: "public",
        handler: (_event, ingestBatchId: string) => context.bootstrapIntakeService.getBatch(ingestBatchId)
      }
    ]
  };
}
