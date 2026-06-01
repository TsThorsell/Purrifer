import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { holdingsAndEventsChannels } from "@features/holdings-and-events/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "holdings-and-events",
    allowedChannels: Object.values(holdingsAndEventsChannels),
    handlers: [
      {
        channel: holdingsAndEventsChannels.createHolding,
        permission: "restricted",
        handler: (_event, input) => context.holdingsAndEventsService.createHolding(input)
      },
      {
        channel: holdingsAndEventsChannels.listHoldings,
        permission: "public",
        handler: (_event, entityId?: string) => context.holdingsAndEventsService.listHoldings(entityId)
      },
      {
        channel: holdingsAndEventsChannels.getHoldingDetails,
        permission: "public",
        handler: (_event, holdingId: string) => context.holdingsAndEventsService.getHoldingDetails(holdingId)
      },
      {
        channel: holdingsAndEventsChannels.createHoldingEvent,
        permission: "restricted",
        handler: (_event, input) => context.holdingsAndEventsService.createHoldingEvent(input)
      },
      {
        channel: holdingsAndEventsChannels.listHoldingTimeline,
        permission: "public",
        handler: (_event, filter) => context.holdingsAndEventsService.listHoldingTimeline(filter)
      },
      {
        channel: holdingsAndEventsChannels.getHoldingAnalysis,
        permission: "public",
        handler: (_event, holdingId: string) => context.holdingsAndEventsService.getHoldingAnalysis(holdingId)
      }
    ]
  };
}
