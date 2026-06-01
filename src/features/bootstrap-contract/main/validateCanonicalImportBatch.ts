import type { CanonicalBatchEnvelope, CanonicalValidationResult, ValidationError } from "../contracts";

const SUPPORTED_RECORD_TYPES = new Set([
  "document_record",
  "payment_event_record",
  "supplier_invoice_record",
  "voucher_link_record",
  "entity_reference_record",
  "account_reference_record"
]);

function parseMajorVersion(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== "string") {
    return null;
  }
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  const major = Number(raw.split(".")[0]);
  if (!Number.isFinite(major)) {
    return null;
  }
  return Math.trunc(major);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushError(errors: ValidationError[], code: string, path: string, message: string): void {
  errors.push({ code, path, message });
}

function validateBaseRecord(record: Record<string, unknown>, index: number, errors: ValidationError[]): void {
  const path = `records[${index}]`;

  const recordVersion = record.schema_version;
  const recordMajor = parseMajorVersion(recordVersion);
  if (recordVersion === undefined || recordVersion === null || recordVersion === "") {
    pushError(errors, "MISSING_RECORD_SCHEMA_VERSION", `${path}.schema_version`, "Record schema_version saknas.");
  } else if (recordMajor !== 1) {
    pushError(errors, "UNSUPPORTED_RECORD_SCHEMA_VERSION", `${path}.schema_version`, "Endast schema_version 1.x stods for records.");
  }

  if (typeof record.record_type !== "string" || !record.record_type.trim()) {
    pushError(errors, "MISSING_RECORD_TYPE", `${path}.record_type`, "record_type ar obligatoriskt.");
  } else if (!SUPPORTED_RECORD_TYPES.has(record.record_type)) {
    pushError(errors, "UNSUPPORTED_RECORD_TYPE", `${path}.record_type`, `Okand record_type: ${record.record_type}`);
  }

  if (typeof record.record_id !== "string" || !record.record_id.trim()) {
    pushError(errors, "MISSING_RECORD_ID", `${path}.record_id`, "record_id ar obligatoriskt.");
  }

  if (typeof record.source_file_id !== "string" || !record.source_file_id.trim()) {
    pushError(errors, "MISSING_SOURCE_FILE_ID", `${path}.source_file_id`, "source_file_id ar obligatoriskt.");
  }

  if (typeof record.confidence_score !== "number") {
    pushError(errors, "MISSING_CONFIDENCE_SCORE", `${path}.confidence_score`, "confidence_score ar obligatoriskt.");
  } else if (record.confidence_score < 0 || record.confidence_score > 1) {
    pushError(errors, "INVALID_CONFIDENCE_SCORE", `${path}.confidence_score`, "confidence_score maste vara 0-1.");
  }

  if (!Array.isArray(record.review_flags) || !record.review_flags.every((entry) => typeof entry === "string")) {
    pushError(errors, "INVALID_REVIEW_FLAGS", `${path}.review_flags`, "review_flags maste vara en lista av strangar.");
  }
}

function validateTypeSpecific(record: Record<string, unknown>, index: number, errors: ValidationError[]): void {
  const path = `records[${index}]`;
  const type = record.record_type;

  if (type === "payment_event_record") {
    if (typeof record.amount !== "number") {
      pushError(errors, "MISSING_PAYMENT_AMOUNT", `${path}.amount`, "payment_event_record.amount ar obligatoriskt.");
    }
    if (typeof record.payment_date !== "string" || !record.payment_date.trim()) {
      pushError(errors, "MISSING_PAYMENT_DATE", `${path}.payment_date`, "payment_event_record.payment_date ar obligatoriskt.");
    }
  }

  if (type === "supplier_invoice_record") {
    if (typeof record.supplier_name !== "string" || !record.supplier_name.trim()) {
      pushError(errors, "MISSING_SUPPLIER_NAME", `${path}.supplier_name`, "supplier_invoice_record.supplier_name ar obligatoriskt.");
    }
    if (typeof record.gross_amount !== "number") {
      pushError(errors, "MISSING_GROSS_AMOUNT", `${path}.gross_amount`, "supplier_invoice_record.gross_amount ar obligatoriskt.");
    }
  }

  if (type === "voucher_link_record") {
    if (typeof record.voucher_id !== "string" || !record.voucher_id.trim()) {
      pushError(errors, "MISSING_VOUCHER_ID", `${path}.voucher_id`, "voucher_link_record.voucher_id ar obligatoriskt.");
    }
    if (typeof record.document_record_id !== "string" || !record.document_record_id.trim()) {
      pushError(errors, "MISSING_DOCUMENT_RECORD_ID", `${path}.document_record_id`, "voucher_link_record.document_record_id ar obligatoriskt.");
    }
  }

  if (type === "entity_reference_record") {
    if (typeof record.entity_id !== "string" || !record.entity_id.trim()) {
      pushError(errors, "MISSING_ENTITY_ID", `${path}.entity_id`, "entity_reference_record.entity_id ar obligatoriskt.");
    }
    if (typeof record.name !== "string" || !record.name.trim()) {
      pushError(errors, "MISSING_ENTITY_NAME", `${path}.name`, "entity_reference_record.name ar obligatoriskt.");
    }
  }

  if (type === "account_reference_record") {
    if (typeof record.account_id !== "string" || !record.account_id.trim()) {
      pushError(errors, "MISSING_ACCOUNT_ID", `${path}.account_id`, "account_reference_record.account_id ar obligatoriskt.");
    }
    if (typeof record.entity_id !== "string" || !record.entity_id.trim()) {
      pushError(errors, "MISSING_ACCOUNT_ENTITY_ID", `${path}.entity_id`, "account_reference_record.entity_id ar obligatoriskt.");
    }
  }
}

export function validateCanonicalImportBatch(payload: unknown): CanonicalValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(payload)) {
    pushError(errors, "INVALID_PAYLOAD", "payload", "Payload maste vara ett objekt.");
    return { ok: false, errors };
  }

  const envelope = payload as unknown as CanonicalBatchEnvelope;
  const batchMajor = parseMajorVersion(envelope.schema_version);
  if (envelope.schema_version === undefined || envelope.schema_version === null || envelope.schema_version === "") {
    pushError(errors, "MISSING_BATCH_SCHEMA_VERSION", "schema_version", "Batch schema_version ar obligatoriskt.");
  } else if (batchMajor !== 1) {
    pushError(errors, "UNSUPPORTED_BATCH_SCHEMA_VERSION", "schema_version", "Endast schema_version 1.x stods for batch.");
  }

  if (typeof envelope.ingest_batch_id !== "string" || !envelope.ingest_batch_id.trim()) {
    pushError(errors, "MISSING_INGEST_BATCH_ID", "ingest_batch_id", "ingest_batch_id ar obligatoriskt.");
  }

  if (typeof envelope.source_system !== "string" || !envelope.source_system.trim()) {
    pushError(errors, "MISSING_SOURCE_SYSTEM", "source_system", "source_system ar obligatoriskt.");
  }

  if (!Array.isArray(envelope.records)) {
    pushError(errors, "MISSING_RECORDS", "records", "records maste vara en lista.");
  } else {
    envelope.records.forEach((record, index) => {
      if (!isObject(record)) {
        pushError(errors, "RECORD_NOT_OBJECT", `records[${index}]`, "Varje record maste vara ett objekt.");
        return;
      }
      validateBaseRecord(record, index, errors);
      validateTypeSpecific(record, index, errors);
    });
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

