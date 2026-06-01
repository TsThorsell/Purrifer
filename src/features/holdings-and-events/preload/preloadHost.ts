import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { holdingsAndEventsChannels } from "@features/holdings-and-events/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "holdings-and-events",
    namespace: "holdingsAndEvents",
    methods: [
      {
        method: "createHolding",
        channel: holdingsAndEventsChannels.createHolding,
        permission: "restricted"
      },
      {
        method: "listHoldings",
        channel: holdingsAndEventsChannels.listHoldings,
        permission: "public"
      },
      {
        method: "getHoldingDetails",
        channel: holdingsAndEventsChannels.getHoldingDetails,
        permission: "public"
      },
      {
        method: "createHoldingEvent",
        channel: holdingsAndEventsChannels.createHoldingEvent,
        permission: "restricted"
      },
      {
        method: "listHoldingTimeline",
        channel: holdingsAndEventsChannels.listHoldingTimeline,
        permission: "public"
      },
      {
        method: "getHoldingAnalysis",
        channel: holdingsAndEventsChannels.getHoldingAnalysis,
        permission: "public"
      }
    ]
  };
}
