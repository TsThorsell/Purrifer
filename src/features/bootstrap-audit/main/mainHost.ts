import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { bootstrapAuditChannels } from "@features/bootstrap-audit/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "bootstrap-audit",
    allowedChannels: Object.values(bootstrapAuditChannels),
    handlers: [
      {
        channel: bootstrapAuditChannels.listAuditTrail,
        permission: "public",
        handler: (_event, filter) => context.bootstrapAuditService.listAuditTrail(filter)
      }
    ]
  };
}
