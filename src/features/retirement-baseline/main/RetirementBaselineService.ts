import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type {
  ApproveRetirementScenarioInput,
  RetirementAssumptions,
  RetirementScenarioComparison,
  RetirementScenarioResult,
  SaveRetirementAssumptionsInput
} from "../contracts";
import { RetirementBaselineRepository } from "./RetirementBaselineRepository";

export class RetirementBaselineService {
  constructor(
    private readonly repository: RetirementBaselineRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async saveRetirementAssumptions(input: SaveRetirementAssumptionsInput): Promise<RetirementAssumptions> {
    if (!input.entityId.trim()) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_ENTITY_REQUIRED",
        message: "entityId kravs for pensionskalkyl.",
        type: "business"
      });
    }

    const item: RetirementAssumptions = {
      entityId: input.entityId.trim(),
      monthlyIncome: Number(input.monthlyIncome),
      monthlyWithdrawal: Number(input.monthlyWithdrawal),
      annualReturnRate: Number(input.annualReturnRate),
      annualInterestRate: Number(input.annualInterestRate),
      horizonYears: Number(input.horizonYears),
      updatedAt: this.nowProvider().toISOString()
    };
    await this.repository.upsertAssumptions(item);
    return item;
  }

  async getRetirementScenario(entityId: string): Promise<RetirementScenarioResult> {
    const assumptions = await this.repository.findAssumptions(entityId.trim());
    if (!assumptions) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_ASSUMPTIONS_MISSING",
        message: `Inga antaganden finns sparade for entitet ${entityId}.`,
        type: "business"
      });
    }
    const baseCapital = await this.repository.sumEntityHoldingsValue(assumptions.entityId);
    const netMonthlyCashflow = assumptions.monthlyIncome - assumptions.monthlyWithdrawal;

    let capital = baseCapital;
    const monthlyRate = assumptions.annualReturnRate / 100 / 12;
    for (let month = 0; month < assumptions.horizonYears * 12; month += 1) {
      capital += netMonthlyCashflow;
      capital += capital * monthlyRate;
    }

    const uncertaintyFlags: string[] = [];
    if (baseCapital === 0) {
      uncertaintyFlags.push("Inget registrerat baskapital fran Innehav hittades.");
    }
    if (assumptions.horizonYears > 30) {
      uncertaintyFlags.push("Lang prognoshorisont ger hog osakerhet.");
    }
    if (Math.abs(assumptions.annualReturnRate) > 15) {
      uncertaintyFlags.push("Avkastningsantagandet ar ovanligt hogt/lagt.");
    }
    if (assumptions.annualInterestRate === 0) {
      uncertaintyFlags.push("Ranteantagande ar 0 och bor granskas manuellt.");
    }

    const scenario: RetirementScenarioResult = {
      scenarioId: await this.sequenceStore.next("RS"),
      entityId: assumptions.entityId,
      baseCapital,
      projectedCapital: capital,
      netMonthlyCashflow,
      assumptions,
      uncertaintyFlags,
      interpretationNote:
        "Baslinjen ar en forenklad projektion utifran sparade antaganden och nuvarande Innehavsunderlag.",
      hitlApproved: false,
      calculatedAt: this.nowProvider().toISOString()
    };

    await this.repository.createScenario(scenario);
    return scenario;
  }

  async approveRetirementScenario(input: ApproveRetirementScenarioInput): Promise<RetirementScenarioResult> {
    if (!input.reviewNote.trim()) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_REVIEW_NOTE_REQUIRED",
        message: "HITL-granskningsnotering kravs for godkannande.",
        type: "business"
      });
    }
    const existing = await this.repository.findScenarioById(input.scenarioId);
    if (!existing) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_SCENARIO_NOT_FOUND",
        message: `Scenario ${input.scenarioId} kunde inte hittas.`,
        type: "business"
      });
    }
    const approvedAt = this.nowProvider().toISOString();
    await this.repository.approveScenario({
      scenarioId: input.scenarioId,
      approvedAt,
      reviewNote: input.reviewNote.trim()
    });
    const approved = await this.repository.findScenarioById(input.scenarioId);
    if (!approved) {
      throw new AppError({
        code: "TECHNICAL_RETIREMENT_SCENARIO_RELOAD_FAILED",
        message: "Kunde inte lasa scenario efter godkannande.",
        type: "technical"
      });
    }
    return approved;
  }

  async listRetirementScenarios(entityId: string): Promise<RetirementScenarioResult[]> {
    if (!entityId.trim()) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_ENTITY_REQUIRED",
        message: "entityId kravs for scenariosokning.",
        type: "business"
      });
    }
    return this.repository.listScenarios(entityId.trim());
  }

  async compareRetirementScenarios(
    entityId: string,
    leftScenarioId: string,
    rightScenarioId: string
  ): Promise<RetirementScenarioComparison> {
    const [left, right] = await Promise.all([
      this.repository.findScenarioById(leftScenarioId),
      this.repository.findScenarioById(rightScenarioId)
    ]);
    if (!left || !right) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_SCENARIO_NOT_FOUND",
        message: "Minst ett scenario kunde inte hittas.",
        type: "business"
      });
    }
    if (left.entityId !== entityId || right.entityId !== entityId) {
      throw new AppError({
        code: "BUSINESS_RETIREMENT_SCENARIO_ENTITY_MISMATCH",
        message: "Scenarierna tillhor inte vald entitet.",
        type: "business"
      });
    }

    const projectedCapitalDelta = right.projectedCapital - left.projectedCapital;
    const netMonthlyCashflowDelta = right.netMonthlyCashflow - left.netMonthlyCashflow;
    const assumptionsDelta = {
      monthlyIncomeDelta: right.assumptions.monthlyIncome - left.assumptions.monthlyIncome,
      monthlyWithdrawalDelta: right.assumptions.monthlyWithdrawal - left.assumptions.monthlyWithdrawal,
      annualReturnRateDelta: right.assumptions.annualReturnRate - left.assumptions.annualReturnRate,
      annualInterestRateDelta: right.assumptions.annualInterestRate - left.assumptions.annualInterestRate,
      horizonYearsDelta: right.assumptions.horizonYears - left.assumptions.horizonYears
    };

    return {
      leftScenarioId,
      rightScenarioId,
      entityId,
      projectedCapitalDelta,
      netMonthlyCashflowDelta,
      assumptionsDelta,
      summary:
        projectedCapitalDelta >= 0
          ? "Hogerscenario visar hogre prognostiserat kapital."
          : "Hogerscenario visar lagre prognostiserat kapital.",
      hitlReviewRequired: true
    };
  }
}
