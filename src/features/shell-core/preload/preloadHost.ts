import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { shellCoreChannels } from "@features/shell-core/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "shell-core",
    namespace: "shellCore",
    methods: [
      {
        method: "listJobs",
        channel: shellCoreChannels.listJobs,
        permission: "public"
      }
    ]
  };
}
