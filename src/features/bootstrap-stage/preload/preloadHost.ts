import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapStageChannels } from "@features/bootstrap-stage/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-stage",
    namespace: "bootstrapStage",
    methods: [
      {
        method: "runStageGate",
        channel: bootstrapStageChannels.runStageGate,
        permission: "restricted"
      },
      {
        method: "listStageBatches",
        channel: bootstrapStageChannels.listStageBatches,
        permission: "public"
      },
      {
        method: "getStageBatch",
        channel: bootstrapStageChannels.getStageBatch,
        permission: "public"
      }
    ]
  };
}
