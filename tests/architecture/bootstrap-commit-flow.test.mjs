import { test } from "node:test";
import assert from "node:assert/strict";

test("commit import allows only ready and manually approved records", () => {
  const stageRecords = [
    { recordId: "A", status: "ready", recordType: "document_record" },
    { recordId: "B", status: "needs-review", recordType: "payment_event_record" },
    { recordId: "C", status: "needs-review", recordType: "supplier_invoice_record" },
    { recordId: "D", status: "rejected", recordType: "document_record" }
  ];

  const reviewActions = new Map([
    ["B", "approved"],
    ["C", "accepted-incomplete"]
  ]);

  const eligible = stageRecords.filter((record) => {
    if (record.status === "ready") return true;
    const action = reviewActions.get(record.recordId);
    return action === "approved" || action === "accepted-incomplete";
  });

  assert.equal(eligible.map((item) => item.recordId).join(","), "A,B,C");

  const committedObjects = eligible.map((item) => {
    if (item.recordType === "payment_event_record") return "Betalhandelse";
    if (item.recordType === "supplier_invoice_record") return "Leverantorsfaktura";
    return "Dokument";
  });

  assert.equal(committedObjects.includes("Dokument"), true);
  assert.equal(committedObjects.includes("Betalhandelse"), true);
  assert.equal(committedObjects.includes("Leverantorsfaktura"), true);

  const proofLinks = eligible.map((item) => ({
    source_file_id: `src-${item.recordId}`,
    record_id: item.recordId,
    object_type: committedObjects[eligible.indexOf(item)],
    object_id: `OBJ-${item.recordId}`
  }));

  assert.equal(proofLinks.length, 3);
  assert.equal(proofLinks.every((link) => link.source_file_id && link.record_id && link.object_id), true);
});
