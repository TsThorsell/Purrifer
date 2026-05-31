import { test } from "node:test";
import assert from "node:assert/strict";

function validateCanonicalImportBatch(payload) {
  const errors = [];
  const major = (value) => {
    if (typeof value === "number") return Math.trunc(value);
    if (typeof value !== "string") return null;
    const m = Number(value.trim().split(".")[0]);
    return Number.isFinite(m) ? Math.trunc(m) : null;
  };

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: [{ code: "INVALID_PAYLOAD" }] };
  }

  if (major(payload.schema_version) !== 1) errors.push({ code: "UNSUPPORTED_BATCH_SCHEMA_VERSION" });
  if (!payload.ingest_batch_id) errors.push({ code: "MISSING_INGEST_BATCH_ID" });
  if (!payload.source_system) errors.push({ code: "MISSING_SOURCE_SYSTEM" });
  if (!Array.isArray(payload.records)) errors.push({ code: "MISSING_RECORDS" });

  if (Array.isArray(payload.records)) {
    for (const record of payload.records) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        errors.push({ code: "RECORD_NOT_OBJECT" });
        continue;
      }
      if (major(record.schema_version) !== 1) errors.push({ code: "UNSUPPORTED_RECORD_SCHEMA_VERSION" });
      if (!record.record_type) errors.push({ code: "MISSING_RECORD_TYPE" });
      if (!record.record_id) errors.push({ code: "MISSING_RECORD_ID" });
      if (!record.source_file_id) errors.push({ code: "MISSING_SOURCE_FILE_ID" });
      if (typeof record.confidence_score !== "number" || record.confidence_score < 0 || record.confidence_score > 1) {
        errors.push({ code: "INVALID_CONFIDENCE_SCORE" });
      }
      if (!Array.isArray(record.review_flags)) errors.push({ code: "INVALID_REVIEW_FLAGS" });
      if (record.record_type === "payment_event_record" && typeof record.amount !== "number") {
        errors.push({ code: "MISSING_PAYMENT_AMOUNT" });
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

test("canonical contract v1 requires versioning on batch and record level", () => {
  const valid = {
    schema_version: "1.0",
    ingest_batch_id: "RB000001",
    source_system: "manual-folder-import",
    records: [
      {
        schema_version: "1.1",
        record_type: "document_record",
        record_id: "DOC-1",
        source_file_id: "raw-1",
        confidence_score: 0.98,
        review_flags: []
      }
    ]
  };

  const result = validateCanonicalImportBatch(valid);
  assert.equal(result.ok, true);
});

test("canonical validator rejects invalid payload with explicit reason codes", () => {
  const invalid = {
    schema_version: "2.0",
    ingest_batch_id: "",
    source_system: "",
    records: [
      {
        schema_version: "2.0",
        record_type: "payment_event_record",
        record_id: "",
        source_file_id: "",
        confidence_score: 2,
        review_flags: "bad",
        amount: "100"
      }
    ]
  };

  const result = validateCanonicalImportBatch(invalid);
  assert.equal(result.ok, false);

  const codes = result.errors.map((err) => err.code);
  assert.equal(codes.includes("UNSUPPORTED_BATCH_SCHEMA_VERSION"), true);
  assert.equal(codes.includes("MISSING_INGEST_BATCH_ID"), true);
  assert.equal(codes.includes("MISSING_SOURCE_SYSTEM"), true);
  assert.equal(codes.includes("UNSUPPORTED_RECORD_SCHEMA_VERSION"), true);
  assert.equal(codes.includes("MISSING_RECORD_ID"), true);
  assert.equal(codes.includes("MISSING_SOURCE_FILE_ID"), true);
  assert.equal(codes.includes("INVALID_CONFIDENCE_SCORE"), true);
  assert.equal(codes.includes("INVALID_REVIEW_FLAGS"), true);
  assert.equal(codes.includes("MISSING_PAYMENT_AMOUNT"), true);
});

test("canonical contract is backward compatible with optional new fields", () => {
  const withOptionalFields = {
    schema_version: "1.0",
    ingest_batch_id: "RB000002",
    source_system: "manual-folder-import",
    source_exported_at: "2026-05-31T09:00:00.000Z",
    records: [
      {
        schema_version: "1.0",
        record_type: "supplier_invoice_record",
        record_id: "INV-1",
        source_file_id: "raw-2",
        confidence_score: 0.9,
        review_flags: ["low-ocr"],
        supplier_name: "Acme",
        gross_amount: 1250,
        optional_future_field: "new",
        nested_optional: { anything: true }
      }
    ],
    optional_batch_future_field: "safe"
  };

  const result = validateCanonicalImportBatch(withOptionalFields);
  assert.equal(result.ok, true);
});
