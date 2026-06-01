import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapPilotDashboardChannels } from "@features/bootstrap-pilot-dashboard/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-pilot-dashboard",
    namespace: "bootstrapPilotDashboard",
    methods: [
      {
        method: "getDashboard",
        channel: bootstrapPilotDashboardChannels.getDashboard,
        permission: "public"
      }
    ]
  };
}
