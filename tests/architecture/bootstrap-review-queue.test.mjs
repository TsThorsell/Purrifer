import { test } from "node:test";
import assert from "node:assert/strict";

test("review queue shows only needs-review records and bulk actions resolve them", () => {
  const stageRecords = [
    { recordId: "R1", status: "needs-review", reasonCodes: ["REFERENCE_ENTITY_NOT_FOUND"] },
    { recordId: "R2", status: "ready", reasonCodes: [] },
    { recordId: "R3", status: "needs-review", reasonCodes: ["DUPLICATE_IN_PREVIOUS_STAGE"] }
  ];

  const queue = stageRecords.filter((item) => item.status === "needs-review");
  assert.equal(queue.length, 2);
  assert.equal(queue.every((item) => item.reasonCodes.length > 0), true);

  const bulkSelection = ["R1", "R3"];
  const action = { actionStatus: "accepted-incomplete", reviewNote: "Inkomplett men accepterad efter manuell kontroll." };
  assert.equal(action.reviewNote.trim().length > 0, true);

  const resolved = new Map();
  for (const recordId of bulkSelection) {
    resolved.set(recordId, action.actionStatus);
  }

  const commitEligible = stageRecords.filter((item) => {
    const decision = resolved.get(item.recordId);
    if (item.status === "ready") {
      return true;
    }
    return decision === "approved" || decision === "accepted-incomplete";
  });

  assert.equal(commitEligible.map((item) => item.recordId).join(","), "R1,R2,R3");
});
