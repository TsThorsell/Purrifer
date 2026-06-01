import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapStageChannels } from "@features/bootstrap-stage/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-stage",
    allowedChannels: Object.values(bootstrapStageChannels),
    handlers: [
      {
        channel: bootstrapStageChannels.runStageGate,
        permission: "restricted",
        handler: (_event, input) => context.bootstrapStageService.runStageGate(input)
      },
      {
        channel: bootstrapStageChannels.listStageBatches,
        permission: "public",
        handler: () => context.bootstrapStageService.listStageBatches()
      },
      {
        channel: bootstrapStageChannels.getStageBatch,
        permission: "public",
        handler: (_event, stageBatchId: string) => context.bootstrapStageService.getStageBatch(stageBatchId)
      }
    ]
  };
}
