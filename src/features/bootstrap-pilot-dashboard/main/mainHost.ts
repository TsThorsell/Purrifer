import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapPilotDashboardChannels } from "@features/bootstrap-pilot-dashboard/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-pilot-dashboard",
    allowedChannels: Object.values(bootstrapPilotDashboardChannels),
    handlers: [
      {
        channel: bootstrapPilotDashboardChannels.getDashboard,
        permission: "public",
        handler: (_event, filter) => context.bootstrapPilotDashboardService.getDashboard(filter)
      }
    ]
  };
}
