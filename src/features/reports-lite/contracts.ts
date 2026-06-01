export interface EntityLedgerEntry {
  date: string;
  entryType: "invoice" | "payment" | "payment-match";
  referenceId: string;
  amount: number;
  source: "invoice-and-payment";
  drilldownRoute: "invoice-and-payment";
  drilldownObjectType: "supplier-invoice" | "payment-event";
  drilldownObjectId: string;
}

export interface EntityBalanceSnapshot {
  entityId: string;
  asOfDate: string;
  inflowTotal: number;
  outflowTotal: number;
  netTotal: number;
  openInvoiceAmount: number;
  note: string;
}

export interface BudgetComparisonRow {
  categoryKey: string;
  categoryLabel: string;
  budgetAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercent: number;
  uncertainty: "none" | "partial" | "high";
  uncertaintyReason?: string;
}

export interface BudgetComparisonResult {
  entityId: string;
  year: number;
  month?: number;
  rows: BudgetComparisonRow[];
  totals: {
    budgetAmount: number;
    actualAmount: number;
    varianceAmount: number;
    variancePercent: number;
  };
  note: string;
}

export interface YearOverYearRow {
  categoryKey: string;
  categoryLabel: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number;
  uncertainty: "none" | "partial" | "high";
  uncertaintyReason?: string;
}

export interface YearOverYearComparisonResult {
  entityId: string;
  year: number;
  month?: number;
  rows: YearOverYearRow[];
  totals: {
    currentAmount: number;
    previousAmount: number;
    deltaAmount: number;
    deltaPercent: number;
  };
  note: string;
}

export interface PeriodDecisionRow {
  categoryKey: string;
  categoryLabel: string;
  periodAAmount: number;
  periodBAmount: number;
  deltaAmount: number;
  deltaPercent: number;
  uncertainty: "none" | "partial" | "high";
  uncertaintyReason?: string;
}

export interface PeriodDecisionView {
  entityId: string;
  periodA: { fromDate: string; toDate: string };
  periodB: { fromDate: string; toDate: string };
  rows: PeriodDecisionRow[];
  totals: {
    periodAAmount: number;
    periodBAmount: number;
    deltaAmount: number;
    deltaPercent: number;
  };
  note: string;
  exportCsv: string;
}

export interface ReportsLiteApi {
  listEntityLedger(entityId: string, fromDate?: string, toDate?: string): Promise<EntityLedgerEntry[]>;
  getEntityBalanceSnapshot(entityId: string, asOfDate?: string): Promise<EntityBalanceSnapshot>;
  getBudgetComparison(entityId: string, year: number, month?: number): Promise<BudgetComparisonResult>;
  getYearOverYearComparison(entityId: string, year: number, month?: number): Promise<YearOverYearComparisonResult>;
  getPeriodDecisionView(
    entityId: string,
    periodAFromDate: string,
    periodAToDate: string,
    periodBFromDate: string,
    periodBToDate: string
  ): Promise<PeriodDecisionView>;
}

export const reportsLiteChannels = {
  listEntityLedger: "reports-lite:list-entity-ledger",
  getEntityBalanceSnapshot: "reports-lite:get-entity-balance-snapshot",
  getBudgetComparison: "reports-lite:get-budget-comparison",
  getYearOverYearComparison: "reports-lite:get-year-over-year-comparison",
  getPeriodDecisionView: "reports-lite:get-period-decision-view"
} as const;

