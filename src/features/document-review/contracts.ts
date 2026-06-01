export interface DocumentFieldExtraction {
  fieldKey: string;
  value: string;
  confidence: number;
  region: { x: number; y: number; width: number; height: number };
}

export interface DocumentTableExtraction {
  tableKey: string;
  headers: string[];
  rows: string[][];
  confidence: number;
}

export interface FieldTemplateInput {
  templateKey: string;
  payloadJson: string;
}

export type DocumentReviewDecisionStatus = "approved" | "rejected" | "manual";

export type DocumentReviewQueueStatus = DocumentReviewDecisionStatus | "needs_review";

export interface ReviewQueueItem {
  documentId: string;
  fileName: string;
  mimeType: string;
  inboxStatus: string;
  queueStatus: DocumentReviewQueueStatus;
  latestReasonCode: string | null;
  latestDecisionStatus: DocumentReviewDecisionStatus | null;
  latestDecidedAt: string | null;
  latestDecisionId: number | null;
}

export interface ReviewDecisionRecord {
  decisionId: number;
  documentId: string;
  decisionStatus: DocumentReviewDecisionStatus;
  reasonCode: string;
  note: string;
  actor: string;
  decidedAt: string;
}

export interface ReviewDecisionInput {
  documentId: string;
  decisionStatus: DocumentReviewDecisionStatus;
  reasonCode: string;
  note: string;
  actor?: string;
}

export interface ReviewCorrectionInput {
  documentId: string;
  reasonCode: string;
  correctionNote: string;
  actor?: string;
}

export interface DocumentReviewApi {
  extractDocumentFields(documentId: string): Promise<DocumentFieldExtraction[]>;
  extractDocumentTables(documentId: string): Promise<DocumentTableExtraction[]>;
  updateFieldRegion(
    documentId: string,
    fieldKey: string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<DocumentFieldExtraction>;
  saveFieldTemplate(input: FieldTemplateInput): Promise<void>;
  saveTableTemplate(input: FieldTemplateInput): Promise<void>;
  listNeedsReviewQueue(): Promise<ReviewQueueItem[]>;
  decideReviewDocument(input: ReviewDecisionInput): Promise<ReviewDecisionRecord>;
  correctRejectedDocument(input: ReviewCorrectionInput): Promise<ReviewDecisionRecord>;
  getDecisionTrail(documentId: string): Promise<ReviewDecisionRecord[]>;
}

export const documentReviewChannels = {
  extractDocumentFields: "document-review:extract-fields",
  extractDocumentTables: "document-review:extract-tables",
  updateFieldRegion: "document-review:update-field-region",
  saveFieldTemplate: "document-review:save-field-template",
  saveTableTemplate: "document-review:save-table-template",
  listNeedsReviewQueue: "document-review:list-needs-review-queue",
  decideReviewDocument: "document-review:decide-review-document",
  correctRejectedDocument: "document-review:correct-rejected-document",
  getDecisionTrail: "document-review:get-decision-trail"
} as const;


