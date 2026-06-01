import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { searchAndIndexChannels } from "@features/search-and-index/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "search-and-index",
    namespace: "searchAndIndex",
    methods: [
      {
        method: "searchAll",
        channel: searchAndIndexChannels.searchAll,
        permission: "public"
      },
      {
        method: "rebuildSearchIndex",
        channel: searchAndIndexChannels.rebuildSearchIndex,
        permission: "restricted"
      },
      {
        method: "getIndexQualityReport",
        channel: searchAndIndexChannels.getIndexQualityReport,
        permission: "public"
      }
    ]
  };
}
