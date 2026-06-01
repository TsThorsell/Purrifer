import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapPreprocessChannels } from "@features/bootstrap-preprocess/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-preprocess",
    allowedChannels: Object.values(bootstrapPreprocessChannels),
    handlers: [
      {
        channel: bootstrapPreprocessChannels.runPreprocess,
        permission: "restricted",
        handler: (_event, input) => context.bootstrapPreprocessService.runPreprocess(input)
      },
      {
        channel: bootstrapPreprocessChannels.listPreprocessBatches,
        permission: "public",
        handler: () => context.bootstrapPreprocessService.listPreprocessBatches()
      },
      {
        channel: bootstrapPreprocessChannels.getPreprocessBatch,
        permission: "public",
        handler: (_event, preprocessBatchId: string) =>
          context.bootstrapPreprocessService.getPreprocessBatch(preprocessBatchId)
      }
    ]
  };
}
