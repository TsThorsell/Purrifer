import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { reportsLiteChannels } from "@features/reports-lite/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "reports-lite",
    namespace: "reportsLite",
    methods: [
      {
        method: "listEntityLedger",
        channel: reportsLiteChannels.listEntityLedger,
        permission: "public"
      },
      {
        method: "getEntityBalanceSnapshot",
        channel: reportsLiteChannels.getEntityBalanceSnapshot,
        permission: "public"
      },
      {
        method: "getBudgetComparison",
        channel: reportsLiteChannels.getBudgetComparison,
        permission: "public"
      },
      {
        method: "getYearOverYearComparison",
        channel: reportsLiteChannels.getYearOverYearComparison,
        permission: "public"
      },
      {
        method: "getPeriodDecisionView",
        channel: reportsLiteChannels.getPeriodDecisionView,
        permission: "public"
      }
    ]
  };
}
