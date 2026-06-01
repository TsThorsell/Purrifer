import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapCommitChannels } from "@features/bootstrap-commit/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-commit",
    namespace: "bootstrapCommit",
    methods: [
      {
        method: "runCommit",
        channel: bootstrapCommitChannels.runCommit,
        permission: "restricted"
      },
      {
        method: "listCommits",
        channel: bootstrapCommitChannels.listCommits,
        permission: "public"
      },
      {
        method: "getCommit",
        channel: bootstrapCommitChannels.getCommit,
        permission: "public"
      }
    ]
  };
}
