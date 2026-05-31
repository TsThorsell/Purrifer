import { AppError } from "@app/shared/errors/AppError";
import { PythonBridge } from "@app/python/PythonBridge";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  DocumentFieldExtraction,
  DocumentTableExtraction,
  FieldTemplateInput
} from "../contracts";

export class DocumentReviewService {
  constructor(
    private readonly pythonBridge: PythonBridge,
    private readonly sqliteDatabase: SqliteDatabase
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
}
