import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapPreprocessChannels } from "@features/bootstrap-preprocess/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-preprocess",
    namespace: "bootstrapPreprocess",
    methods: [
      {
        method: "runPreprocess",
        channel: bootstrapPreprocessChannels.runPreprocess,
        permission: "restricted"
      },
      {
        method: "listPreprocessBatches",
        channel: bootstrapPreprocessChannels.listPreprocessBatches,
        permission: "public"
      },
      {
        method: "getPreprocessBatch",
        channel: bootstrapPreprocessChannels.getPreprocessBatch,
        permission: "public"
      }
    ]
  };
}
