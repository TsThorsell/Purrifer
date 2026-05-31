import { test } from "node:test";
import assert from "node:assert/strict";

test("stage gate classifies records with schema/ref/dedupe outcomes", () => {
  const payload = {
    records: [
      {
        record_type: "document_record",
        record_id: "DOC-1",
        source_file_id: "h1",
        valid: true,
        entity_id: "E1"
      },
      {
        record_type: "document_record",
        record_id: "DOC-1",
        source_file_id: "h1",
        valid: true,
        entity_id: "E1"
      },
      {
        record_type: "payment_event_record",
        record_id: "PAY-1",
        source_file_id: "h2",
        valid: false,
        entity_id: "E404"
      }
    ]
  };

  const knownEntities = new Set(["E1"]);
  const previousFingerprints = new Set(["document_record::DOC-1::h1"]);
  const seen = new Set();

  const decisions = payload.records.map((record) => {
    const fingerprint = `${record.record_type}::${record.record_id}::${record.source_file_id}`;
    const reasons = [];

    if (seen.has(fingerprint)) {
      reasons.push("DUPLICATE_IN_STAGE_BATCH");
    } else {
      seen.add(fingerprint);
    }

    if (previousFingerprints.has(fingerprint)) {
      reasons.push("DUPLICATE_IN_PREVIOUS_STAGE");
    }

    if (!record.valid) {
      reasons.push("SCHEMA_VALIDATION_FAILED");
    }

    if (record.entity_id && !knownEntities.has(record.entity_id)) {
      reasons.push("REFERENCE_ENTITY_NOT_FOUND");
    }

    const status = reasons.includes("SCHEMA_VALIDATION_FAILED")
      ? "rejected"
      : reasons.length > 0
        ? "needs-review"
        : "ready";

    return { ...record, status, reasons };
  });

  assert.equal(decisions[0].status, "needs-review");
  assert.equal(decisions[0].reasons.includes("DUPLICATE_IN_PREVIOUS_STAGE"), true);

  assert.equal(decisions[1].status, "needs-review");
  assert.equal(decisions[1].reasons.includes("DUPLICATE_IN_STAGE_BATCH"), true);

  assert.equal(decisions[2].status, "rejected");
  assert.equal(decisions[2].reasons.includes("SCHEMA_VALIDATION_FAILED"), true);
  assert.equal(decisions[2].reasons.includes("REFERENCE_ENTITY_NOT_FOUND"), true);

  assert.equal(decisions.every((item) => ["ready", "needs-review", "rejected"].includes(item.status)), true);
});
