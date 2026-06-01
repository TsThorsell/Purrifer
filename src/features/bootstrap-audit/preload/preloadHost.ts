import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { bootstrapAuditChannels } from "@features/bootstrap-audit/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "bootstrap-audit",
    namespace: "bootstrapAudit",
    methods: [
      {
        method: "listAuditTrail",
        channel: bootstrapAuditChannels.listAuditTrail,
        permission: "public"
      }
    ]
  };
}
