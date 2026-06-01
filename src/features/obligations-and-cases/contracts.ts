export type ObligationStatus =
  | "draft"
  | "active"
  | "waiting"
  | "done"
  | "accepted-incomplete"
  | "archived";

export type CaseStatus =
  | "new"
  | "draft"
  | "waiting"
  | "done"
  | "accepted-incomplete"
  | "archived";

export interface ObligationSummary {
  obligationId: string;
  title: string;
  status: ObligationStatus;
  entityId?: string;
  dueDate?: string;
  updatedAt: string;
}

export interface ObligationDetails extends ObligationSummary {
  description?: string;
  createdAt: string;
}

export interface CreateObligationInput {
  title: string;
  description?: string;
  status: ObligationStatus;
  entityId?: string;
  dueDate?: string;
}

export interface UpdateObligationInput {
  obligationId: string;
  title?: string;
  description?: string;
  status?: ObligationStatus;
  entityId?: string;
  dueDate?: string;
}

export interface CaseChecklistItem {
  checklistItemId: string;
  caseId: string;
  label: string;
  completedAt?: string;
}

export interface CaseSummary {
  caseId: string;
  obligationId: string;
  title: string;
  status: CaseStatus;
  updatedAt: string;
}

export interface CaseDetails extends CaseSummary {
  description?: string;
  createdAt: string;
  checklist: CaseChecklistItem[];
}

export interface CreateCaseInput {
  obligationId: string;
  title: string;
  description?: string;
  status: CaseStatus;
}

export interface UpdateCaseInput {
  caseId: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
}

export interface CreateChecklistItemInput {
  caseId: string;
  label: string;
}

export interface CompleteChecklistItemInput {
  checklistItemId: string;
}

export type DeviationRule = "due-soon" | "overdue-unpaid" | "inbox-no-action";

export type DeviationSourceType = "obligation" | "invoice" | "inbox-item";

export interface DeviationCaseSummary {
  caseId: string;
  obligationId?: string;
  rule: DeviationRule;
  sourceType: DeviationSourceType;
  sourceId: string;
  title: string;
  status: CaseStatus;
  detectedAt: string;
  updatedAt: string;
}

export interface RunDeviationScanResult {
  scannedAt: string;
  createdCount: number;
  createdCaseIds: string[];
}

export interface ObligationsAndCasesApi {
  createObligation(input: CreateObligationInput): Promise<ObligationDetails>;
  updateObligation(input: UpdateObligationInput): Promise<ObligationDetails>;
  listObligations(): Promise<ObligationSummary[]>;
  getObligationDetails(obligationId: string): Promise<ObligationDetails>;
  createCase(input: CreateCaseInput): Promise<CaseDetails>;
  updateCase(input: UpdateCaseInput): Promise<CaseDetails>;
  listCases(obligationId?: string): Promise<CaseSummary[]>;
  getCaseDetails(caseId: string): Promise<CaseDetails>;
  createChecklistItem(input: CreateChecklistItemInput): Promise<CaseChecklistItem>;
  completeChecklistItem(input: CompleteChecklistItemInput): Promise<CaseChecklistItem>;
  runDeviationScan(): Promise<RunDeviationScanResult>;
  listDeviationCases(): Promise<DeviationCaseSummary[]>;
}

export const obligationsAndCasesChannels = {
  createObligation: "obligations-and-cases:create-obligation",
  updateObligation: "obligations-and-cases:update-obligation",
  listObligations: "obligations-and-cases:list-obligations",
  getObligationDetails: "obligations-and-cases:get-obligation-details",
  createCase: "obligations-and-cases:create-case",
  updateCase: "obligations-and-cases:update-case",
  listCases: "obligations-and-cases:list-cases",
  getCaseDetails: "obligations-and-cases:get-case-details",
  createChecklistItem: "obligations-and-cases:create-checklist-item",
  completeChecklistItem: "obligations-and-cases:complete-checklist-item",
  runDeviationScan: "obligations-and-cases:run-deviation-scan",
  listDeviationCases: "obligations-and-cases:list-deviation-cases"
} as const;

