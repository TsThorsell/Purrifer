import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapCommitChannels } from "@features/bootstrap-commit/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-commit",
    allowedChannels: Object.values(bootstrapCommitChannels),
    handlers: [
      {
        channel: bootstrapCommitChannels.runCommit,
        permission: "restricted",
        handler: (_event, input) => context.bootstrapCommitService.runCommit(input)
      },
      {
        channel: bootstrapCommitChannels.listCommits,
        permission: "public",
        handler: () => context.bootstrapCommitService.listCommits()
      },
      {
        channel: bootstrapCommitChannels.getCommit,
        permission: "public",
        handler: (_event, commitBatchId: string) => context.bootstrapCommitService.getCommit(commitBatchId)
      }
    ]
  };
}
