export interface RetirementAssumptions {
  entityId: string;
  monthlyIncome: number;
  monthlyWithdrawal: number;
  annualReturnRate: number;
  annualInterestRate: number;
  horizonYears: number;
  updatedAt: string;
}

export interface RetirementScenarioResult {
  scenarioId: string;
  entityId: string;
  baseCapital: number;
  projectedCapital: number;
  netMonthlyCashflow: number;
  assumptions: RetirementAssumptions;
  uncertaintyFlags: string[];
  interpretationNote: string;
  hitlApproved: boolean;
  hitlApprovedAt?: string;
  hitlReviewNote?: string;
  calculatedAt: string;
}

export interface RetirementScenarioComparison {
  leftScenarioId: string;
  rightScenarioId: string;
  entityId: string;
  projectedCapitalDelta: number;
  netMonthlyCashflowDelta: number;
  assumptionsDelta: {
    monthlyIncomeDelta: number;
    monthlyWithdrawalDelta: number;
    annualReturnRateDelta: number;
    annualInterestRateDelta: number;
    horizonYearsDelta: number;
  };
  summary: string;
  hitlReviewRequired: boolean;
}

export interface SaveRetirementAssumptionsInput {
  entityId: string;
  monthlyIncome: number;
  monthlyWithdrawal: number;
  annualReturnRate: number;
  annualInterestRate: number;
  horizonYears: number;
}

export interface ApproveRetirementScenarioInput {
  scenarioId: string;
  reviewNote: string;
}

export interface RetirementBaselineApi {
  saveRetirementAssumptions(input: SaveRetirementAssumptionsInput): Promise<RetirementAssumptions>;
  getRetirementScenario(entityId: string): Promise<RetirementScenarioResult>;
  approveRetirementScenario(input: ApproveRetirementScenarioInput): Promise<RetirementScenarioResult>;
  listRetirementScenarios(entityId: string): Promise<RetirementScenarioResult[]>;
  compareRetirementScenarios(
    entityId: string,
    leftScenarioId: string,
    rightScenarioId: string
  ): Promise<RetirementScenarioComparison>;
}

export const retirementBaselineChannels = {
  saveRetirementAssumptions: "retirement-baseline:save-assumptions",
  getRetirementScenario: "retirement-baseline:get-scenario",
  approveRetirementScenario: "retirement-baseline:approve-scenario",
  listRetirementScenarios: "retirement-baseline:list-scenarios",
  compareRetirementScenarios: "retirement-baseline:compare-scenarios"
} as const;
