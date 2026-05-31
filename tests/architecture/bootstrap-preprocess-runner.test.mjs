import { test } from "node:test";
import assert from "node:assert/strict";

test("offline preprocess runner emits canonical records with confidence and review flags", () => {
  const rawFiles = [
    { fileHash: "h1", fileType: "pdf", fullPath: "C:/raw/receipt.pdf", sizeBytes: 2000 },
    { fileHash: "h2", fileType: "csv", fullPath: "C:/raw/bank.csv", sizeBytes: 6000 },
    { fileHash: "h3", fileType: "pdf", fullPath: "C:/raw/invoice-2026.pdf", sizeBytes: 3500 }
  ];

  const records = rawFiles.map((file, index) => {
    const lowerPath = file.fullPath.toLowerCase();
    if (lowerPath.includes("invoice")) {
      return {
        schema_version: "1.0",
        record_type: "supplier_invoice_record",
        record_id: `INVREC-${index + 1}`,
        source_file_id: file.fileHash,
        confidence_score: 0.74,
        review_flags: ["needs-amount-confirmation"]
      };
    }
    if (file.fileType === "csv" || file.fileType === "xlsx") {
      return {
        schema_version: "1.0",
        record_type: "payment_event_record",
        record_id: `PAYREC-${index + 1}`,
        source_file_id: file.fileHash,
        confidence_score: 0.68,
        review_flags: ["tabular-source-needs-human-check"]
      };
    }
    return {
      schema_version: "1.0",
      record_type: "document_record",
      record_id: `DOCREC-${index + 1}`,
      source_file_id: file.fileHash,
      confidence_score: 0.88,
      review_flags: []
    };
  });

  const payload = {
    schema_version: "1.0",
    ingest_batch_id: "RB000123",
    source_system: "manual-folder-import",
    records
  };

  assert.equal(payload.records.length, 3);
  assert.equal(payload.records.every((record) => typeof record.confidence_score === "number"), true);
  assert.equal(payload.records.every((record) => Array.isArray(record.review_flags)), true);
  assert.equal(payload.records.some((record) => record.record_type === "payment_event_record"), true);
  assert.equal(payload.records.some((record) => record.record_type === "supplier_invoice_record"), true);

  const forbiddenDomainWrites = ["invoices", "payment_events", "vouchers", "obligations", "holdings"];
  const payloadText = JSON.stringify(payload);
  assert.equal(forbiddenDomainWrites.some((token) => payloadText.includes(`\"${token}\"`)), false);
});
