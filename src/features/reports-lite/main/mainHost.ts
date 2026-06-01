import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { reportsLiteChannels } from "@features/reports-lite/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "reports-lite",
    allowedChannels: Object.values(reportsLiteChannels),
    handlers: [
      {
        channel: reportsLiteChannels.listEntityLedger,
        permission: "public",
        handler: (_event, entityId: string, fromDate?: string, toDate?: string) =>
          context.reportsLiteService.listEntityLedger(entityId, fromDate, toDate)
      },
      {
        channel: reportsLiteChannels.getEntityBalanceSnapshot,
        permission: "public",
        handler: (_event, entityId: string, asOfDate?: string) =>
          context.reportsLiteService.getEntityBalanceSnapshot(entityId, asOfDate)
      },
      {
        channel: reportsLiteChannels.getBudgetComparison,
        permission: "public",
        handler: (
          _event,
          entityId: string,
          year: number,
          month?: number
        ) => context.reportsLiteService.getBudgetComparison(entityId, year, month)
      },
      {
        channel: reportsLiteChannels.getYearOverYearComparison,
        permission: "public",
        handler: (
          _event,
          entityId: string,
          year: number,
          month?: number
        ) => context.reportsLiteService.getYearOverYearComparison(entityId, year, month)
      },
      {
        channel: reportsLiteChannels.getPeriodDecisionView,
        permission: "public",
        handler: (
          _event,
          entityId: string,
          periodAFromDate: string,
          periodAToDate: string,
          periodBFromDate: string,
          periodBToDate: string
        ) =>
          context.reportsLiteService.getPeriodDecisionView(
            entityId,
            periodAFromDate,
            periodAToDate,
            periodBFromDate,
            periodBToDate
          )
      }
    ]
  };
}
