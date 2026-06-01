import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { searchAndIndexChannels } from "@features/search-and-index/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "search-and-index",
    allowedChannels: Object.values(searchAndIndexChannels),
    handlers: [
      {
        channel: searchAndIndexChannels.searchAll,
        permission: "public",
        handler: (_event, query: string) => context.searchAndIndexService.searchAll(query)
      },
      {
        channel: searchAndIndexChannels.rebuildSearchIndex,
        permission: "restricted",
        handler: () => context.searchAndIndexService.rebuildSearchIndex()
      },
      {
        channel: searchAndIndexChannels.getIndexQualityReport,
        permission: "public",
        handler: () => context.searchAndIndexService.getIndexQualityReport()
      }
    ]
  };
}
