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
}

export const documentReviewChannels = {
  extractDocumentFields: "document-review:extract-fields",
  extractDocumentTables: "document-review:extract-tables",
  updateFieldRegion: "document-review:update-field-region",
  saveFieldTemplate: "document-review:save-field-template",
  saveTableTemplate: "document-review:save-table-template"
} as const;

