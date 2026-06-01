import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapReviewChannels } from "@features/bootstrap-review/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-review",
    namespace: "bootstrapReview",
    methods: [
      {
        method: "listNeedsReviewQueue",
        channel: bootstrapReviewChannels.listNeedsReviewQueue,
        permission: "public"
      },
      {
        method: "applyBulkAction",
        channel: bootstrapReviewChannels.applyBulkAction,
        permission: "restricted"
      }
    ]
  };
}
