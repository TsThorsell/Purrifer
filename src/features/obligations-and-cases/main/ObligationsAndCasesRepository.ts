import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  CaseChecklistItem,
  CaseDetails,
  CaseSummary,
  DeviationCaseSummary,
  DeviationRule,
  DeviationSourceType,
  ObligationDetails,
  ObligationSummary
} from "../contracts";

export class ObligationsAndCasesRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async create(item: ObligationDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO obligations (
        obligation_id, title, description, status, entity_id, due_date, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      item.obligationId,
      item.title,
      item.description ?? null,
      item.status,
      item.entityId ?? null,
      item.dueDate ?? null,
      item.createdAt,
      item.updatedAt
    );
  }

  async update(item: ObligationDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      UPDATE obligations
      SET title = ?, description = ?, status = ?, entity_id = ?, due_date = ?, updated_at = ?
      WHERE obligation_id = ?
      `
    ).run(
      item.title,
      item.description ?? null,
      item.status,
      item.entityId ?? null,
      item.dueDate ?? null,
      item.updatedAt,
      item.obligationId
    );
  }

  async list(): Promise<ObligationSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT obligation_id, title, status, entity_id, due_date, updated_at
      FROM obligations
      ORDER BY updated_at DESC
      `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      obligationId: String(row.obligation_id),
      title: String(row.title),
      status: row.status as ObligationSummary["status"],
      entityId: row.entity_id ? String(row.entity_id) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      updatedAt: String(row.updated_at)
    }));
  }

  async findById(obligationId: string): Promise<ObligationDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT obligation_id, title, description, status, entity_id, due_date, created_at, updated_at
      FROM obligations
      WHERE obligation_id = ?
      `
      )
      .get(obligationId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      obligationId: String(row.obligation_id),
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      status: row.status as ObligationDetails["status"],
      entityId: row.entity_id ? String(row.entity_id) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  async createCase(item: CaseDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO obligation_cases (
        case_id, obligation_id, title, description, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      item.caseId,
      item.obligationId,
      item.title,
      item.description ?? null,
      item.status,
      item.createdAt,
      item.updatedAt
    );
  }

  async updateCase(item: CaseDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      UPDATE obligation_cases
      SET title = ?, description = ?, status = ?, updated_at = ?
      WHERE case_id = ?
      `
    ).run(item.title, item.description ?? null, item.status, item.updatedAt, item.caseId);
  }

  async listCases(obligationId?: string): Promise<CaseSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = (obligationId
      ? db.prepare(
          `
        SELECT case_id, obligation_id, title, status, updated_at
        FROM obligation_cases
        WHERE obligation_id = ?
        ORDER BY updated_at DESC
        `
        ).all(obligationId)
      : db.prepare(
          `
        SELECT case_id, obligation_id, title, status, updated_at
        FROM obligation_cases
        ORDER BY updated_at DESC
        `
        ).all()) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      caseId: String(row.case_id),
      obligationId: String(row.obligation_id),
      title: String(row.title),
      status: row.status as CaseSummary["status"],
      updatedAt: String(row.updated_at)
    }));
  }

  async findCaseById(caseId: string): Promise<CaseDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT case_id, obligation_id, title, description, status, created_at, updated_at
      FROM obligation_cases
      WHERE case_id = ?
      `
      )
      .get(caseId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    const checklistRows = db
      .prepare(
        `
      SELECT checklist_item_id, case_id, label, completed_at
      FROM case_checklist_items
      WHERE case_id = ?
      ORDER BY checklist_item_id ASC
      `
      )
      .all(caseId) as Array<Record<string, unknown>>;

    return {
      caseId: String(row.case_id),
      obligationId: String(row.obligation_id),
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      status: row.status as CaseDetails["status"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      checklist: checklistRows.map((entry) => ({
        checklistItemId: String(entry.checklist_item_id),
        caseId: String(entry.case_id),
        label: String(entry.label),
        completedAt: entry.completed_at ? String(entry.completed_at) : undefined
      }))
    };
  }

  async createChecklistItem(item: CaseChecklistItem): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO case_checklist_items (checklist_item_id, case_id, label, completed_at)
      VALUES (?, ?, ?, ?)
      `
    ).run(item.checklistItemId, item.caseId, item.label, item.completedAt ?? null);
  }

  async setChecklistItemCompleted(checklistItemId: string, completedAt: string): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      UPDATE case_checklist_items
      SET completed_at = ?
      WHERE checklist_item_id = ?
      `
    ).run(completedAt, checklistItemId);
  }

  async findChecklistItemById(checklistItemId: string): Promise<CaseChecklistItem | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT checklist_item_id, case_id, label, completed_at
      FROM case_checklist_items
      WHERE checklist_item_id = ?
      `
      )
      .get(checklistItemId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      checklistItemId: String(row.checklist_item_id),
      caseId: String(row.case_id),
      label: String(row.label),
      completedAt: row.completed_at ? String(row.completed_at) : undefined
    };
  }

  async listDueSoonObligations(fromDateIso: string, toDateIso: string): Promise<ObligationSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT obligation_id, title, status, entity_id, due_date, updated_at
      FROM obligations
      WHERE due_date IS NOT NULL
        AND due_date >= ?
        AND due_date <= ?
        AND status NOT IN ('done', 'accepted-incomplete', 'archived')
      ORDER BY due_date ASC
      `
      )
      .all(fromDateIso, toDateIso) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      obligationId: String(row.obligation_id),
      title: String(row.title),
      status: row.status as ObligationSummary["status"],
      entityId: row.entity_id ? String(row.entity_id) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      updatedAt: String(row.updated_at)
    }));
  }

  async listOverdueUnpaidObligations(nowIso: string): Promise<ObligationSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT o.obligation_id, o.title, o.status, o.entity_id, o.due_date, o.updated_at
      FROM obligations o
      WHERE o.due_date IS NOT NULL
        AND o.due_date < ?
        AND o.status NOT IN ('done', 'accepted-incomplete', 'archived')
        AND (
          o.entity_id IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM invoices i
            WHERE i.entity_id = o.entity_id
              AND i.status = 'paid'
          )
        )
      ORDER BY o.due_date ASC
      `
      )
      .all(nowIso) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      obligationId: String(row.obligation_id),
      title: String(row.title),
      status: row.status as ObligationSummary["status"],
      entityId: row.entity_id ? String(row.entity_id) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      updatedAt: String(row.updated_at)
    }));
  }

  async listInboxItemsWithoutAction(): Promise<Array<{ documentId: string; fileName: string; receivedAt: string }>> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT i.document_id, i.file_name, i.received_at
      FROM inbox_items i
      WHERE NOT EXISTS (
        SELECT 1
        FROM vouchers v
        WHERE v.source_document_id = i.document_id
      )
      ORDER BY i.received_at DESC
      `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      documentId: String(row.document_id),
      fileName: String(row.file_name),
      receivedAt: String(row.received_at)
    }));
  }

  async findDefaultObligationId(): Promise<string | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT obligation_id
      FROM obligations
      ORDER BY updated_at DESC
      LIMIT 1
      `
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }
    return String(row.obligation_id);
  }

  async findDeviationCaseByKey(
    rule: DeviationRule,
    sourceType: DeviationSourceType,
    sourceId: string
  ): Promise<DeviationCaseSummary | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
      SELECT d.case_id, d.obligation_id, d.rule, d.source_type, d.source_id, c.title, c.status, d.detected_at, c.updated_at
      FROM deviation_cases d
      INNER JOIN obligation_cases c ON c.case_id = d.case_id
      WHERE d.rule = ? AND d.source_type = ? AND d.source_id = ?
      `
      )
      .get(rule, sourceType, sourceId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    return {
      caseId: String(row.case_id),
      obligationId: row.obligation_id ? String(row.obligation_id) : undefined,
      rule: row.rule as DeviationRule,
      sourceType: row.source_type as DeviationSourceType,
      sourceId: String(row.source_id),
      title: String(row.title),
      status: row.status as CaseSummary["status"],
      detectedAt: String(row.detected_at),
      updatedAt: String(row.updated_at)
    };
  }

  async createDeviationCase(item: {
    caseDetails: CaseDetails;
    rule: DeviationRule;
    sourceType: DeviationSourceType;
    sourceId: string;
    detectedAt: string;
  }): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO obligation_cases (
          case_id, obligation_id, title, description, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        item.caseDetails.caseId,
        item.caseDetails.obligationId,
        item.caseDetails.title,
        item.caseDetails.description ?? null,
        item.caseDetails.status,
        item.caseDetails.createdAt,
        item.caseDetails.updatedAt
      );
      db.prepare(
        `
        INSERT INTO deviation_cases (
          case_id, obligation_id, rule, source_type, source_id, detected_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `
      ).run(
        item.caseDetails.caseId,
        item.caseDetails.obligationId,
        item.rule,
        item.sourceType,
        item.sourceId,
        item.detectedAt
      );
    });
    transaction();
  }

  async listDeviationCases(): Promise<DeviationCaseSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT d.case_id, d.obligation_id, d.rule, d.source_type, d.source_id, c.title, c.status, d.detected_at, c.updated_at
      FROM deviation_cases d
      INNER JOIN obligation_cases c ON c.case_id = d.case_id
      ORDER BY d.detected_at DESC
      `
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      caseId: String(row.case_id),
      obligationId: row.obligation_id ? String(row.obligation_id) : undefined,
      rule: row.rule as DeviationRule,
      sourceType: row.source_type as DeviationSourceType,
      sourceId: String(row.source_id),
      title: String(row.title),
      status: row.status as CaseSummary["status"],
      detectedAt: String(row.detected_at),
      updatedAt: String(row.updated_at)
    }));
  }
}

