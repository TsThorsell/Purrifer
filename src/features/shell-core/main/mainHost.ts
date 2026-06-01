import type { MainSliceHost } from "@app/registry/mainHostTypes";
import type { MainHostContext } from "@app/registry/mainHostTypes";
import { shellCoreChannels } from "@features/shell-core/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "shell-core",
    allowedChannels: Object.values(shellCoreChannels),
    handlers: [
      {
        channel: shellCoreChannels.listJobs,
        permission: "public",
        handler: () => context.shellCoreService.listJobs()
      }
    ]
  };
}
