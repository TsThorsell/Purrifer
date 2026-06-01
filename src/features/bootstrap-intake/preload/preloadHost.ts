import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapIntakeChannels } from "@features/bootstrap-intake/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-intake",
    namespace: "bootstrapIntake",
    methods: [
      {
        method: "selectFoldersAndIngest",
        channel: bootstrapIntakeChannels.selectFoldersAndIngest,
        permission: "restricted"
      },
      {
        method: "getScannerCapabilities",
        channel: bootstrapIntakeChannels.getScannerCapabilities,
        permission: "public"
      },
      {
        method: "scanToBatch",
        channel: bootstrapIntakeChannels.scanToBatch,
        permission: "restricted"
      },
      {
        method: "listBatches",
        channel: bootstrapIntakeChannels.listBatches,
        permission: "public"
      },
      {
        method: "getBatch",
        channel: bootstrapIntakeChannels.getBatch,
        permission: "public"
      }
    ]
  };
}
