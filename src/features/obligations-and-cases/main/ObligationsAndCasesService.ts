import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type {
  CaseChecklistItem,
  CaseDetails,
  CaseSummary,
  CreateCaseInput,
  CreateChecklistItemInput,
  CompleteChecklistItemInput,
  CreateObligationInput,
  DeviationCaseSummary,
  DeviationRule,
  DeviationSourceType,
  ObligationDetails,
  ObligationSummary,
  RunDeviationScanResult,
  UpdateCaseInput,
  UpdateObligationInput
} from "../contracts";
import { ObligationsAndCasesRepository } from "./ObligationsAndCasesRepository";

export class ObligationsAndCasesService {
  constructor(
    private readonly repository: ObligationsAndCasesRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async createObligation(input: CreateObligationInput): Promise<ObligationDetails> {
    if (!input.title.trim()) {
      throw new AppError({
        code: "BUSINESS_OBLIGATION_TITLE_REQUIRED",
        message: "Titel kravs for atagande.",
        type: "business"
      });
    }

    const now = this.nowProvider().toISOString();
    const obligation: ObligationDetails = {
      obligationId: await this.sequenceStore.next("O"),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: input.status,
      entityId: input.entityId?.trim() || undefined,
      dueDate: input.dueDate?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.create(obligation);
    return obligation;
  }

  async updateObligation(input: UpdateObligationInput): Promise<ObligationDetails> {
    const current = await this.getObligationDetails(input.obligationId);
    const updated: ObligationDetails = {
      ...current,
      title: input.title?.trim() ? input.title.trim() : current.title,
      description:
        input.description !== undefined ? input.description.trim() || undefined : current.description,
      status: input.status ?? current.status,
      entityId: input.entityId !== undefined ? input.entityId.trim() || undefined : current.entityId,
      dueDate: input.dueDate !== undefined ? input.dueDate.trim() || undefined : current.dueDate,
      updatedAt: this.nowProvider().toISOString()
    };
    await this.repository.update(updated);
    return updated;
  }

  async listObligations(): Promise<ObligationSummary[]> {
    return this.repository.list();
  }

  async getObligationDetails(obligationId: string): Promise<ObligationDetails> {
    const obligation = await this.repository.findById(obligationId);
    if (!obligation) {
      throw new AppError({
        code: "BUSINESS_OBLIGATION_NOT_FOUND",
        message: `Atagande ${obligationId} kunde inte hittas.`,
        type: "business"
      });
    }
    return obligation;
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetails> {
    if (!input.obligationId.trim()) {
      throw new AppError({
        code: "BUSINESS_CASE_OBLIGATION_REQUIRED",
        message: "obligationId kravs for arende.",
        type: "business"
      });
    }
    if (!input.title.trim()) {
      throw new AppError({
        code: "BUSINESS_CASE_TITLE_REQUIRED",
        message: "Titel kravs for arende.",
        type: "business"
      });
    }

    // Mandatory link: case must reference an existing obligation in this v1 scope.
    await this.getObligationDetails(input.obligationId);

    const now = this.nowProvider().toISOString();
    const item: CaseDetails = {
      caseId: await this.sequenceStore.next("C"),
      obligationId: input.obligationId.trim(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: input.status,
      createdAt: now,
      updatedAt: now,
      checklist: []
    };
    await this.repository.createCase(item);
    return item;
  }

  async updateCase(input: UpdateCaseInput): Promise<CaseDetails> {
    const current = await this.getCaseDetails(input.caseId);
    const updated: CaseDetails = {
      ...current,
      title: input.title?.trim() ? input.title.trim() : current.title,
      description:
        input.description !== undefined ? input.description.trim() || undefined : current.description,
      status: input.status ?? current.status,
      updatedAt: this.nowProvider().toISOString()
    };
    await this.repository.updateCase(updated);
    return this.getCaseDetails(updated.caseId);
  }

  async listCases(obligationId?: string): Promise<CaseSummary[]> {
    if (obligationId && obligationId.trim()) {
      await this.getObligationDetails(obligationId.trim());
      return this.repository.listCases(obligationId.trim());
    }
    return this.repository.listCases();
  }

  async getCaseDetails(caseId: string): Promise<CaseDetails> {
    const item = await this.repository.findCaseById(caseId);
    if (!item) {
      throw new AppError({
        code: "BUSINESS_CASE_NOT_FOUND",
        message: `Arende ${caseId} kunde inte hittas.`,
        type: "business"
      });
    }
    return item;
  }

  async createChecklistItem(input: CreateChecklistItemInput): Promise<CaseChecklistItem> {
    if (!input.label.trim()) {
      throw new AppError({
        code: "BUSINESS_CHECKLIST_LABEL_REQUIRED",
        message: "Checklistepunkt kravs.",
        type: "business"
      });
    }
    await this.getCaseDetails(input.caseId);

    const item: CaseChecklistItem = {
      checklistItemId: await this.sequenceStore.next("CL"),
      caseId: input.caseId,
      label: input.label.trim()
    };
    await this.repository.createChecklistItem(item);
    return item;
  }

  async completeChecklistItem(input: CompleteChecklistItemInput): Promise<CaseChecklistItem> {
    const existing = await this.repository.findChecklistItemById(input.checklistItemId);
    if (!existing) {
      throw new AppError({
        code: "BUSINESS_CHECKLIST_ITEM_NOT_FOUND",
        message: `Checklistepunkt ${input.checklistItemId} kunde inte hittas.`,
        type: "business"
      });
    }
    const completedAt = this.nowProvider().toISOString();
    await this.repository.setChecklistItemCompleted(input.checklistItemId, completedAt);
    return {
      ...existing,
      completedAt
    };
  }

  async runDeviationScan(): Promise<RunDeviationScanResult> {
    const now = this.nowProvider();
    const scannedAt = now.toISOString();
    const nowDate = scannedAt.slice(0, 10);
    const dueSoonEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const createdCaseIds: string[] = [];

    const dueSoonObligations = await this.repository.listDueSoonObligations(nowDate, dueSoonEnd);
    for (const obligation of dueSoonObligations) {
      const created = await this.ensureDeviationCase({
        rule: "due-soon",
        sourceType: "obligation",
        sourceId: obligation.obligationId,
        obligationId: obligation.obligationId,
        title: `Avvikelse: forfallodatum narmar sig (${obligation.title})`,
        description: `Atagande ${obligation.obligationId} har forfallodatum ${obligation.dueDate ?? "-"}.`,
        detectedAt: scannedAt
      });
      if (created) {
        createdCaseIds.push(created.caseId);
      }
    }

    const overdueObligations = await this.repository.listOverdueUnpaidObligations(nowDate);
    for (const obligation of overdueObligations) {
      const created = await this.ensureDeviationCase({
        rule: "overdue-unpaid",
        sourceType: "obligation",
        sourceId: obligation.obligationId,
        obligationId: obligation.obligationId,
        title: `Avvikelse: betalning saknas efter forfall (${obligation.title})`,
        description: `Atagande ${obligation.obligationId} har passerat forfallodatum ${obligation.dueDate ?? "-"}.`,
        detectedAt: scannedAt
      });
      if (created) {
        createdCaseIds.push(created.caseId);
      }
    }

    const inboxNoActionItems = await this.repository.listInboxItemsWithoutAction();
    for (const inboxItem of inboxNoActionItems) {
      const defaultObligationId = await this.repository.findDefaultObligationId();
      if (!defaultObligationId) {
        continue;
      }
      const created = await this.ensureDeviationCase({
        rule: "inbox-no-action",
        sourceType: "inbox-item",
        sourceId: inboxItem.documentId,
        obligationId: defaultObligationId,
        title: `Avvikelse: dokument utan atgard (${inboxItem.fileName})`,
        description: `Dokument ${inboxItem.documentId} inkom ${inboxItem.receivedAt} utan kopplad atgard.`,
        detectedAt: scannedAt
      });
      if (created) {
        createdCaseIds.push(created.caseId);
      }
    }

    return {
      scannedAt,
      createdCount: createdCaseIds.length,
      createdCaseIds
    };
  }

  async listDeviationCases(): Promise<DeviationCaseSummary[]> {
    return this.repository.listDeviationCases();
  }

  private async ensureDeviationCase(input: {
    rule: DeviationRule;
    sourceType: DeviationSourceType;
    sourceId: string;
    obligationId: string;
    title: string;
    description: string;
    detectedAt: string;
  }): Promise<CaseDetails | undefined> {
    const existing = await this.repository.findDeviationCaseByKey(
      input.rule,
      input.sourceType,
      input.sourceId
    );
    if (existing) {
      return undefined;
    }

    const now = this.nowProvider().toISOString();
    const caseDetails: CaseDetails = {
      caseId: await this.sequenceStore.next("DC"),
      obligationId: input.obligationId,
      title: input.title,
      description: input.description,
      status: "new",
      createdAt: now,
      updatedAt: now,
      checklist: []
    };

    await this.repository.createDeviationCase({
      caseDetails,
      rule: input.rule,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      detectedAt: input.detectedAt
    });
    return caseDetails;
  }
}
