export const CANONICAL_SCHEMA_MAJOR = 1;

export type CanonicalRecordType =
  | "document_record"
  | "payment_event_record"
  | "supplier_invoice_record"
  | "voucher_link_record"
  | "entity_reference_record"
  | "account_reference_record";

export interface CanonicalBatchEnvelope {
  schema_version: string | number;
  ingest_batch_id: string;
  source_system: string;
  source_exported_at?: string;
  records: unknown[];
}

export interface ValidationError {
  code: string;
  path: string;
  message: string;
}

export interface CanonicalValidationResult {
  ok: boolean;
  errors: ValidationError[];
}
