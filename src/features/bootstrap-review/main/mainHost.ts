import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapReviewChannels } from "@features/bootstrap-review/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-review",
    allowedChannels: Object.values(bootstrapReviewChannels),
    handlers: [
      {
        channel: bootstrapReviewChannels.listNeedsReviewQueue,
        permission: "public",
        handler: (_event, input) => context.bootstrapReviewService.listNeedsReviewQueue(input)
      },
      {
        channel: bootstrapReviewChannels.applyBulkAction,
        permission: "restricted",
        handler: (_event, input) => context.bootstrapReviewService.applyBulkAction(input)
      }
    ]
  };
}
