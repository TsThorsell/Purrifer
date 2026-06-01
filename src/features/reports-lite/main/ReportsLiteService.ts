import { AppError } from "@app/shared/errors/AppError";
import type {
  BudgetComparisonResult,
  BudgetComparisonRow,
  EntityBalanceSnapshot,
  EntityLedgerEntry,
  PeriodDecisionRow,
  PeriodDecisionView,
  YearOverYearComparisonResult,
  YearOverYearRow
} from "../contracts";
import { ReportsLiteRepository } from "./ReportsLiteRepository";

export class ReportsLiteService {
  constructor(
    private readonly repository: ReportsLiteRepository,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async listEntityLedger(entityId: string, fromDate?: string, toDate?: string): Promise<EntityLedgerEntry[]> {
    const safeEntityId = this.requireEntityId(entityId);
    return this.repository.listEntityLedger(safeEntityId, fromDate, toDate);
  }

  async getEntityBalanceSnapshot(entityId: string, asOfDate?: string): Promise<EntityBalanceSnapshot> {
    const safeEntityId = this.requireEntityId(entityId);

    const asOf = asOfDate?.trim() || this.nowProvider().toISOString().slice(0, 10);
    const source = await this.repository.getBalanceSourceRows(safeEntityId);

    const outflowTotal = source.invoiceTotals.gross;
    const inflowTotal = source.paymentTotal;
    const netTotal = inflowTotal - outflowTotal;

    return {
      entityId: safeEntityId,
      asOfDate: asOf,
      inflowTotal,
      outflowTotal,
      netTotal,
      openInvoiceAmount: source.invoiceTotals.open,
      note: "Forenklad balansoversikt i v1, ej full bokforingsbalans."
    };
  }

  async getBudgetComparison(entityId: string, year: number, month?: number): Promise<BudgetComparisonResult> {
    const safeEntityId = this.requireEntityId(entityId);
    const budgetRows = await this.repository.listBudgetRows(safeEntityId, year, month);
    const actualRows = await this.repository.listActualCategoryAmounts(safeEntityId, year, month);

    const actualMap = new Map(actualRows.map((row) => [row.categoryKey, row]));
    const budgetMap = new Map(budgetRows.map((row) => [row.categoryKey, row]));

    const keys = new Set<string>([...budgetMap.keys(), ...actualMap.keys()]);

    const rows: BudgetComparisonRow[] = [...keys].sort((a, b) => a.localeCompare(b, "sv")).map((key) => {
      const budget = budgetMap.get(key);
      const actual = actualMap.get(key);
      const budgetAmount = budget?.budgetAmount ?? 0;
      const actualAmount = actual?.amount ?? 0;
      const varianceAmount = actualAmount - budgetAmount;
      const variancePercent = budgetAmount !== 0 ? (varianceAmount / Math.abs(budgetAmount)) * 100 : 0;

      let uncertainty: "none" | "partial" | "high" = "none";
      let uncertaintyReason: string | undefined;

      if (!budget) {
        uncertainty = "high";
        uncertaintyReason = "Budgetunderlag saknas for kategorin.";
      } else if (!actual || (actual?.sourceCount ?? 0) < 2) {
        uncertainty = "partial";
        uncertaintyReason = "Utfall bygger pa begransat underlag.";
      }

      return {
        categoryKey: key,
        categoryLabel: budget?.categoryLabel ?? this.defaultLabelFromKey(key),
        budgetAmount,
        actualAmount,
        varianceAmount,
        variancePercent,
        uncertainty,
        uncertaintyReason
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.budgetAmount += row.budgetAmount;
        acc.actualAmount += row.actualAmount;
        acc.varianceAmount += row.varianceAmount;
        return acc;
      },
      { budgetAmount: 0, actualAmount: 0, varianceAmount: 0, variancePercent: 0 }
    );
    totals.variancePercent = totals.budgetAmount !== 0 ? (totals.varianceAmount / Math.abs(totals.budgetAmount)) * 100 : 0;

    return {
      entityId: safeEntityId,
      year,
      month,
      rows,
      totals,
      note: "Forenklad budget mot utfall i v1. Kategorisering ar heuristisk och kraver manuell kontroll."
    };
  }

  async getYearOverYearComparison(entityId: string, year: number, month?: number): Promise<YearOverYearComparisonResult> {
    const safeEntityId = this.requireEntityId(entityId);

    const currentRows = await this.repository.listActualCategoryAmounts(safeEntityId, year, month);
    const previousRows = await this.repository.listActualCategoryAmounts(safeEntityId, year - 1, month);

    const currentMap = new Map(currentRows.map((row) => [row.categoryKey, row]));
    const previousMap = new Map(previousRows.map((row) => [row.categoryKey, row]));
    const keys = new Set<string>([...currentMap.keys(), ...previousMap.keys()]);

    const rows: YearOverYearRow[] = [...keys].sort((a, b) => a.localeCompare(b, "sv")).map((key) => {
      const current = currentMap.get(key);
      const previous = previousMap.get(key);
      const currentAmount = current?.amount ?? 0;
      const previousAmount = previous?.amount ?? 0;
      const deltaAmount = currentAmount - previousAmount;
      const deltaPercent = previousAmount !== 0 ? (deltaAmount / Math.abs(previousAmount)) * 100 : 0;

      let uncertainty: "none" | "partial" | "high" = "none";
      let uncertaintyReason: string | undefined;
      if (!previous && !current) {
        uncertainty = "high";
        uncertaintyReason = "Bade innevarande och foregaende ar saknar data.";
      } else if (!previous || !current) {
        uncertainty = "partial";
        uncertaintyReason = "Endast ett av aren har data for kategorin.";
      }

      return {
        categoryKey: key,
        categoryLabel: this.defaultLabelFromKey(key),
        currentAmount,
        previousAmount,
        deltaAmount,
        deltaPercent,
        uncertainty,
        uncertaintyReason
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.currentAmount += row.currentAmount;
        acc.previousAmount += row.previousAmount;
        acc.deltaAmount += row.deltaAmount;
        return acc;
      },
      { currentAmount: 0, previousAmount: 0, deltaAmount: 0, deltaPercent: 0 }
    );
    totals.deltaPercent = totals.previousAmount !== 0 ? (totals.deltaAmount / Math.abs(totals.previousAmount)) * 100 : 0;

    return {
      entityId: safeEntityId,
      year,
      month,
      rows,
      totals,
      note: "Forenkad ar-jamforelse i v1. Kategoriindelning och datatackning ar delvis heuristisk."
    };
  }

  async getPeriodDecisionView(
    entityId: string,
    periodAFromDate: string,
    periodAToDate: string,
    periodBFromDate: string,
    periodBToDate: string
  ): Promise<PeriodDecisionView> {
    const safeEntityId = this.requireEntityId(entityId);
    const periodA = this.normalizePeriod(periodAFromDate, periodAToDate);
    const periodB = this.normalizePeriod(periodBFromDate, periodBToDate);

    const dateToYearMonth = (date: string) => {
      const [year, month] = date.split("-").map((part) => Number(part));
      return { year, month };
    };

    const aStart = dateToYearMonth(periodA.fromDate);
    const bStart = dateToYearMonth(periodB.fromDate);

    const rowsA = await this.repository.listActualCategoryAmounts(safeEntityId, aStart.year, aStart.month);
    const rowsB = await this.repository.listActualCategoryAmounts(safeEntityId, bStart.year, bStart.month);

    const mapA = new Map(rowsA.map((row) => [row.categoryKey, row]));
    const mapB = new Map(rowsB.map((row) => [row.categoryKey, row]));
    const keys = new Set<string>([...mapA.keys(), ...mapB.keys()]);

    const rows: PeriodDecisionRow[] = [...keys]
      .sort((a, b) => a.localeCompare(b, "sv"))
      .map((key) => {
        const left = mapA.get(key);
        const right = mapB.get(key);
        const periodAAmount = left?.amount ?? 0;
        const periodBAmount = right?.amount ?? 0;
        const deltaAmount = periodBAmount - periodAAmount;
        const deltaPercent = periodAAmount !== 0 ? (deltaAmount / Math.abs(periodAAmount)) * 100 : 0;

        let uncertainty: "none" | "partial" | "high" = "none";
        let uncertaintyReason: string | undefined;
        if (!left || !right) {
          uncertainty = "partial";
          uncertaintyReason = "En av perioderna saknar underlag for kategorin.";
        }
        if ((left?.sourceCount ?? 0) < 2 || (right?.sourceCount ?? 0) < 2) {
          uncertainty = uncertainty === "none" ? "partial" : uncertainty;
          uncertaintyReason = uncertaintyReason ?? "Begransat antal kallrader i minst en period.";
        }

        return {
          categoryKey: key,
          categoryLabel: this.defaultLabelFromKey(key),
          periodAAmount,
          periodBAmount,
          deltaAmount,
          deltaPercent,
          uncertainty,
          uncertaintyReason
        };
      });

    const totals = rows.reduce(
      (acc, row) => {
        acc.periodAAmount += row.periodAAmount;
        acc.periodBAmount += row.periodBAmount;
        acc.deltaAmount += row.deltaAmount;
        return acc;
      },
      { periodAAmount: 0, periodBAmount: 0, deltaAmount: 0, deltaPercent: 0 }
    );
    totals.deltaPercent =
      totals.periodAAmount !== 0 ? (totals.deltaAmount / Math.abs(totals.periodAAmount)) * 100 : 0;

    const csvHeader = "categoryKey,categoryLabel,periodAAmount,periodBAmount,deltaAmount,deltaPercent,uncertainty,uncertaintyReason";
    const csvRows = rows.map((row) =>
      [
        row.categoryKey,
        row.categoryLabel,
        row.periodAAmount.toFixed(2),
        row.periodBAmount.toFixed(2),
        row.deltaAmount.toFixed(2),
        row.deltaPercent.toFixed(2),
        row.uncertainty,
        row.uncertaintyReason ?? ""
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );

    return {
      entityId: safeEntityId,
      periodA,
      periodB,
      rows,
      totals,
      note: "Beslutsvy for periodjamforelse i exportvanligt format. Underlag bor granskas manuellt innan beslut.",
      exportCsv: [csvHeader, ...csvRows].join("\n")
    };
  }

  private requireEntityId(entityId: string): string {
    const value = entityId.trim();
    if (!value) {
      throw new AppError({
        code: "BUSINESS_REPORTS_ENTITY_REQUIRED",
        message: "entityId kravs for rapport.",
        type: "business"
      });
    }
    return value;
  }

  private normalizePeriod(fromDate: string, toDate: string): { fromDate: string; toDate: string } {
    const from = fromDate.trim();
    const to = toDate.trim();
    if (!from || !to) {
      throw new AppError({
        code: "BUSINESS_REPORTS_PERIOD_REQUIRED",
        message: "Bade fromDate och toDate kravs for periodjamforelse.",
        type: "business"
      });
    }
    if (from > to) {
      throw new AppError({
        code: "BUSINESS_REPORTS_PERIOD_INVALID_RANGE",
        message: "fromDate maste vara mindre an eller lika med toDate.",
        type: "business"
      });
    }
    return { fromDate: from, toDate: to };
  }

  private defaultLabelFromKey(key: string): string {
    if (key === "insurance") return "Forsakring";
    if (key === "drift-energi") return "Drift och energi";
    if (key === "lokal-hyra") return "Lokal och hyra";
    if (key.startsWith("payment-")) return `Betalning ${key.replace("payment-", "")}`;
    return "Ovriga kostnader";
  }
}

