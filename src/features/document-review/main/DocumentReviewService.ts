import { AppError } from "@app/shared/errors/AppError";
import { PythonBridge } from "@app/python/PythonBridge";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  DocumentReviewDecisionRecord,
  DocumentReviewDecisionStatus,
  ReviewCorrectionInput,
  ReviewDecisionInput,
  ReviewQueueItem,
  DocumentFieldExtraction,
  DocumentTableExtraction,
  FieldTemplateInput
} from "../contracts";

const DECISION_STATUS_VALUES = ["approved", "rejected", "manual"] as const;

export class DocumentReviewService {
  constructor(
    private readonly pythonBridge: PythonBridge,
    private readonly sqliteDatabase: SqliteDatabase,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async extractDocumentFields(documentId: string): Promise<DocumentFieldExtraction[]> {
    if (!documentId) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_ID_REQUIRED",
        message: "Dokument-id kravs for falthamtning.",
        type: "business"
      });
    }
    return this.pythonBridge.request<DocumentFieldExtraction[]>("extractDocumentFields", { documentId });
  }

  async extractDocumentTables(documentId: string): Promise<DocumentTableExtraction[]> {
    if (!documentId) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_ID_REQUIRED",
        message: "Dokument-id kravs for tabellhamtning.",
        type: "business"
      });
    }
    return this.pythonBridge.request<DocumentTableExtraction[]>("extractDocumentTables", { documentId });
  }

  async updateFieldRegion(
    documentId: string,
    fieldKey: string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<DocumentFieldExtraction> {
    return this.pythonBridge.request<DocumentFieldExtraction>("updateFieldRegion", {
      documentId,
      fieldKey,
      region
    });
  }

  async saveFieldTemplate(input: FieldTemplateInput): Promise<void> {
    await this.storeTemplate("field", input);
    await this.pythonBridge.request("saveFieldTemplate", { ...input });
  }

  async saveTableTemplate(input: FieldTemplateInput): Promise<void> {
    await this.storeTemplate("table", input);
    await this.pythonBridge.request("saveTableTemplate", { ...input });
  }

  async listNeedsReviewQueue(): Promise<ReviewQueueItem[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        i.document_id,
        i.file_name,
        i.mime_type,
        i.status AS inbox_status,
        l.decision_status AS latest_status,
        l.reason_code AS latest_reason_code,
        l.decided_at AS latest_decided_at,
        l.decision_id AS latest_decision_id
      FROM inbox_items AS i
      LEFT JOIN (
        SELECT d1.document_id, d1.decision_status, d1.reason_code, d1.decided_at, d1.decision_id
        FROM document_review_decisions AS d1
        INNER JOIN (
          SELECT document_id, MAX(decision_id) AS latest_decision_id
          FROM document_review_decisions
          GROUP BY document_id
        ) latest_map ON latest_map.document_id = d1.document_id
          AND latest_map.latest_decision_id = d1.decision_id
      ) l ON l.document_id = i.document_id
      WHERE (l.decision_status IS NULL AND i.status != 'reviewed') OR l.decision_status IN ('rejected', 'manual')
      ORDER BY COALESCE(l.decided_at, i.received_at) DESC;
      `
      )
      .all() as Array<{
      document_id: string;
      file_name: string;
      mime_type: string;
      inbox_status: string;
      latest_status: DocumentReviewDecisionStatus | null;
      latest_reason_code: string | null;
      latest_decided_at: string | null;
      latest_decision_id: number | null;
    }>;

    return rows.map((row) => {
      const isNeedsReview = !row.latest_status || !row.latest_decision_id;
      return {
        documentId: row.document_id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        inboxStatus: row.inbox_status,
        queueStatus: isNeedsReview ? "needs_review" : row.latest_status,
        latestReasonCode: row.latest_reason_code,
        latestDecisionStatus: row.latest_status,
        latestDecidedAt: row.latest_decided_at,
        latestDecisionId: row.latest_decision_id
      };
    });
  }

  async decideReviewDocument(input: ReviewDecisionInput): Promise<DocumentReviewDecisionRecord> {
    const normalized = this.normalizeDecisionInput(input);
    await this.assertDocumentExists(normalized.documentId);
    const db = await this.sqliteDatabase.open();
    const rowId = db
      .prepare(
        `
      INSERT INTO document_review_decisions(
        document_id,
        decision_status,
        reason_code,
        note,
        actor,
        decided_at
      )
      VALUES (@documentId, @decisionStatus, @reasonCode, @note, @actor, @decidedAt)
      `
      )
      .run({
        documentId: normalized.documentId,
        decisionStatus: normalized.decisionStatus,
        reasonCode: normalized.reasonCode,
        note: normalized.note,
        actor: normalized.actor,
        decidedAt: this.nowProvider().toISOString()
      });

    const record = db
      .prepare(
        `
      SELECT
        decision_id,
        document_id,
        decision_status,
        reason_code,
        note,
        actor,
        decided_at
      FROM document_review_decisions
      WHERE decision_id = @id
      `
      )
      .get(rowId.lastInsertRowid) as
      | {
          decision_id: number;
          document_id: string;
          decision_status: DocumentReviewDecisionStatus;
          reason_code: string;
          note: string;
          actor: string;
          decided_at: string;
        }
      | undefined;

    if (!record) {
      throw new AppError({
        code: "TECHNICAL_DECISION_MISSING",
        message: "Beslutsrad kunde inte läsas efter insert.",
        type: "technical"
      });
    }

    return this.mapDecisionRecord(record);
  }

  async correctRejectedDocument(input: ReviewCorrectionInput): Promise<DocumentReviewDecisionRecord> {
    const documentId = input.documentId.trim();
    if (!documentId) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_ID_REQUIRED",
        message: "Dokument-id kravs for korrigering av review-beslut.",
        type: "business"
      });
    }

    const note = input.correctionNote.trim();
    const reasonCode = input.reasonCode.trim();
    if (!note) {
      throw new AppError({
        code: "BUSINESS_REVIEW_CORRECTION_NOTE_REQUIRED",
        message: "Korrigeringsanteckning ar skyldig.",
        type: "business"
      });
    }
    if (!reasonCode) {
      throw new AppError({
        code: "BUSINESS_REVIEW_REASON_CODE_REQUIRED",
        message: "Orsakskod ar skyldig.",
        type: "business"
      });
    }

    await this.assertDocumentExists(documentId);

    const latest = await this.getLatestDecision(documentId);
    if (!latest || latest.decision_status !== "rejected") {
      throw new AppError({
        code: "BUSINESS_REVIEW_ONLY_REJECTED_CAN_CORRECT",
        message: "Endast avvisade beslut kan korrigeras och returneras.",
        type: "business"
      });
    }

    return this.decideReviewDocument({
      documentId,
      decisionStatus: "manual",
      reasonCode,
      note,
      actor: input.actor?.trim() || "operator"
    });
  }

  async getDecisionTrail(documentId: string): Promise<DocumentReviewDecisionRecord[]> {
    const normalizedDocumentId = documentId.trim();
    if (!normalizedDocumentId) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_ID_REQUIRED",
        message: "Dokument-id kravs for att hämta beslutslogg.",
        type: "business"
      });
    }

    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare(
        `
      SELECT
        decision_id,
        document_id,
        decision_status,
        reason_code,
        note,
        actor,
        decided_at
      FROM document_review_decisions
      WHERE document_id = @documentId
      ORDER BY decision_id DESC
      `
      )
      .all({ documentId: normalizedDocumentId }) as Array<{
      decision_id: number;
      document_id: string;
      decision_status: DocumentReviewDecisionStatus;
      reason_code: string;
      note: string;
      actor: string;
      decided_at: string;
    }>;

    return rows.map((row) => this.mapDecisionRecord(row));
  }

  private async storeTemplate(templateType: "field" | "table", input: FieldTemplateInput): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const id = `${templateType}:${input.templateKey}`;
    db.prepare(
      `
      INSERT INTO document_review_templates(id, template_type, template_key, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload_json = excluded.payload_json,
        created_at = excluded.created_at
      `
    ).run(id, templateType, input.templateKey, input.payloadJson, new Date().toISOString());
  }

  private normalizeDecisionInput(input: ReviewDecisionInput): {
    documentId: string;
    decisionStatus: DocumentReviewDecisionStatus;
    reasonCode: string;
    note: string;
    actor: string;
  } {
    const documentId = input.documentId.trim();
    if (!documentId) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_ID_REQUIRED",
        message: "Dokument-id kravs for granskningsbeslut.",
        type: "business"
      });
    }

    const decisionStatus = input.decisionStatus.trim() as DocumentReviewDecisionStatus;
    if (!DECISION_STATUS_VALUES.includes(decisionStatus)) {
      throw new AppError({
        code: "BUSINESS_REVIEW_DECISION_STATUS_INVALID",
        message: "Ogiltig granskningsstatus.",
        type: "business"
      });
    }

    const reasonCode = input.reasonCode.trim();
    if (!reasonCode) {
      throw new AppError({
        code: "BUSINESS_REVIEW_REASON_CODE_REQUIRED",
        message: "Orsakskod ar skyldig.",
        type: "business"
      });
    }

    const note = input.note.trim();
    if (!note) {
      throw new AppError({
        code: "BUSINESS_REVIEW_NOTE_REQUIRED",
        message: "Anteckning ar skyldig vid granskningsbeslut.",
        type: "business"
      });
    }

    const actor = input.actor?.trim() || "operator";

    return { documentId, decisionStatus, reasonCode, note, actor };
  }

  private async assertDocumentExists(documentId: string): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const found = db
      .prepare("SELECT 1 AS exists FROM inbox_items WHERE document_id = ?")
      .get(documentId) as { exists?: number } | undefined;

    if (!found) {
      throw new AppError({
        code: "BUSINESS_DOCUMENT_NOT_IN_INBOX",
        message: `Dokument ${documentId} finns inte i inkorgen.`,
        type: "business"
      });
    }
  }

  private async getLatestDecision(
    documentId: string
  ): Promise<{ decision_status: DocumentReviewDecisionStatus } | null> {
    const db = await this.sqliteDatabase.open();
    return (
      (db
        .prepare(
          `
      SELECT decision_status
      FROM document_review_decisions
      WHERE document_id = ?
      ORDER BY decision_id DESC
      LIMIT 1
      `
        )
        .get(documentId) as { decision_status: DocumentReviewDecisionStatus } | undefined) ?? null
    );
  }

  private mapDecisionRecord(row: {
    decision_id: number;
    document_id: string;
    decision_status: DocumentReviewDecisionStatus;
    reason_code: string;
    note: string;
    actor: string;
    decided_at: string;
  }): DocumentReviewDecisionRecord {
    return {
      decisionId: row.decision_id,
      documentId: row.document_id,
      decisionStatus: row.decision_status,
      reasonCode: row.reason_code,
      note: row.note,
      actor: row.actor,
      decidedAt: row.decided_at
    };
  }
}

