import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { RetirementAssumptions, RetirementScenarioResult } from "../contracts";

export class RetirementBaselineRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async upsertAssumptions(item: RetirementAssumptions): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO retirement_assumptions (
        entity_id, monthly_income, monthly_withdrawal, annual_return_rate, annual_interest_rate, horizon_years, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity_id) DO UPDATE SET
        monthly_income = excluded.monthly_income,
        monthly_withdrawal = excluded.monthly_withdrawal,
        annual_return_rate = excluded.annual_return_rate,
        annual_interest_rate = excluded.annual_interest_rate,
        horizon_years = excluded.horizon_years,
        updated_at = excluded.updated_at
      `
    ).run(
      item.entityId,
      item.monthlyIncome,
      item.monthlyWithdrawal,
      item.annualReturnRate,
      item.annualInterestRate,
      item.horizonYears,
      item.updatedAt
    );
  }

  async findAssumptions(entityId: string): Promise<RetirementAssumptions | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT entity_id, monthly_income, monthly_withdrawal, annual_return_rate, annual_interest_rate, horizon_years, updated_at
        FROM retirement_assumptions
        WHERE entity_id = ?
        `
      )
      .get(entityId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      entityId: String(row.entity_id),
      monthlyIncome: Number(row.monthly_income),
      monthlyWithdrawal: Number(row.monthly_withdrawal),
      annualReturnRate: Number(row.annual_return_rate),
      annualInterestRate: Number(row.annual_interest_rate),
      horizonYears: Number(row.horizon_years),
      updatedAt: String(row.updated_at)
    };
  }

  async sumEntityHoldingsValue(entityId: string): Promise<number> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT holding_id
        FROM holdings
        WHERE entity_id = ?
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;

    let total = 0;
    for (const row of rows) {
      const holdingId = String(row.holding_id);
      const latestValuation = db
        .prepare(
          `
          SELECT amount
          FROM holding_events
          WHERE holding_id = ? AND event_type = 'valuation'
          ORDER BY event_date DESC, created_at DESC
          LIMIT 1
          `
        )
        .get(holdingId) as Record<string, unknown> | undefined;
      if (latestValuation) {
        total += Number(latestValuation.amount);
        continue;
      }
      const deposits = db
        .prepare(
          `
          SELECT COALESCE(SUM(ABS(amount)), 0) as sum
          FROM holding_events
          WHERE holding_id = ? AND event_type = 'deposit'
          `
        )
        .get(holdingId) as Record<string, unknown>;
      const withdrawals = db
        .prepare(
          `
          SELECT COALESCE(SUM(ABS(amount)), 0) as sum
          FROM holding_events
          WHERE holding_id = ? AND event_type = 'withdrawal'
          `
        )
        .get(holdingId) as Record<string, unknown>;
      total += Number(deposits.sum) - Number(withdrawals.sum);
    }
    return total;
  }

  async createScenario(item: RetirementScenarioResult): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO retirement_scenarios (
        scenario_id, entity_id, base_capital, projected_capital, net_monthly_cashflow, assumptions_json,
        uncertainty_json, interpretation_note, hitl_approved, hitl_approved_at, hitl_review_note, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      item.scenarioId,
      item.entityId,
      item.baseCapital,
      item.projectedCapital,
      item.netMonthlyCashflow,
      JSON.stringify(item.assumptions),
      JSON.stringify(item.uncertaintyFlags),
      item.interpretationNote,
      item.hitlApproved ? 1 : 0,
      item.hitlApprovedAt ?? null,
      item.hitlReviewNote ?? null,
      item.calculatedAt
    );
  }

  async findLatestScenario(entityId: string): Promise<RetirementScenarioResult | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT scenario_id, entity_id, base_capital, projected_capital, net_monthly_cashflow, assumptions_json,
               uncertainty_json, interpretation_note, hitl_approved, hitl_approved_at, hitl_review_note, calculated_at
        FROM retirement_scenarios
        WHERE entity_id = ?
        ORDER BY calculated_at DESC
        LIMIT 1
        `
      )
      .get(entityId) as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }
    return {
      scenarioId: String(row.scenario_id),
      entityId: String(row.entity_id),
      baseCapital: Number(row.base_capital),
      projectedCapital: Number(row.projected_capital),
      netMonthlyCashflow: Number(row.net_monthly_cashflow),
      assumptions: JSON.parse(String(row.assumptions_json)) as RetirementAssumptions,
      uncertaintyFlags: JSON.parse(String(row.uncertainty_json)) as string[],
      interpretationNote: String(row.interpretation_note),
      hitlApproved: Number(row.hitl_approved) === 1,
      hitlApprovedAt: row.hitl_approved_at ? String(row.hitl_approved_at) : undefined,
      hitlReviewNote: row.hitl_review_note ? String(row.hitl_review_note) : undefined,
      calculatedAt: String(row.calculated_at)
    };
  }

  async listScenarios(entityId: string): Promise<RetirementScenarioResult[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
        SELECT scenario_id, entity_id, base_capital, projected_capital, net_monthly_cashflow, assumptions_json,
               uncertainty_json, interpretation_note, hitl_approved, hitl_approved_at, hitl_review_note, calculated_at
        FROM retirement_scenarios
        WHERE entity_id = ?
        ORDER BY calculated_at DESC
        `
      )
      .all(entityId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      scenarioId: String(row.scenario_id),
      entityId: String(row.entity_id),
      baseCapital: Number(row.base_capital),
      projectedCapital: Number(row.projected_capital),
      netMonthlyCashflow: Number(row.net_monthly_cashflow),
      assumptions: JSON.parse(String(row.assumptions_json)) as RetirementAssumptions,
      uncertaintyFlags: JSON.parse(String(row.uncertainty_json)) as string[],
      interpretationNote: String(row.interpretation_note),
      hitlApproved: Number(row.hitl_approved) === 1,
      hitlApprovedAt: row.hitl_approved_at ? String(row.hitl_approved_at) : undefined,
      hitlReviewNote: row.hitl_review_note ? String(row.hitl_review_note) : undefined,
      calculatedAt: String(row.calculated_at)
    }));
  }

  async approveScenario(input: {
    scenarioId: string;
    approvedAt: string;
    reviewNote: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      UPDATE retirement_scenarios
      SET hitl_approved = 1,
          hitl_approved_at = ?,
          hitl_review_note = ?
      WHERE scenario_id = ?
      `
    ).run(input.approvedAt, input.reviewNote, input.scenarioId);
  }

  async findScenarioById(scenarioId: string): Promise<RetirementScenarioResult | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT scenario_id, entity_id, base_capital, projected_capital, net_monthly_cashflow, assumptions_json,
               uncertainty_json, interpretation_note, hitl_approved, hitl_approved_at, hitl_review_note, calculated_at
        FROM retirement_scenarios
        WHERE scenario_id = ?
        `
      )
      .get(scenarioId) as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }
    return {
      scenarioId: String(row.scenario_id),
      entityId: String(row.entity_id),
      baseCapital: Number(row.base_capital),
      projectedCapital: Number(row.projected_capital),
      netMonthlyCashflow: Number(row.net_monthly_cashflow),
      assumptions: JSON.parse(String(row.assumptions_json)) as RetirementAssumptions,
      uncertaintyFlags: JSON.parse(String(row.uncertainty_json)) as string[],
      interpretationNote: String(row.interpretation_note),
      hitlApproved: Number(row.hitl_approved) === 1,
      hitlApprovedAt: row.hitl_approved_at ? String(row.hitl_approved_at) : undefined,
      hitlReviewNote: row.hitl_review_note ? String(row.hitl_review_note) : undefined,
      calculatedAt: String(row.calculated_at)
    };
  }
}

