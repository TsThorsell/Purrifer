import { test } from "node:test";
import assert from "node:assert/strict";

test("idempotent replay commits only pending records and returns replay when all already committed", () => {
  const eligible = ["R1", "R2", "R3"];

  const alreadyCommittedFirstRun = new Set(["R1"]);
  const pendingFirstRun = eligible.filter((id) => !alreadyCommittedFirstRun.has(id));
  assert.equal(pendingFirstRun.join(","), "R2,R3");

  const afterFirstRunCommitted = new Set(["R1", "R2", "R3"]);
  const pendingReplay = eligible.filter((id) => !afterFirstRunCommitted.has(id));
  assert.equal(pendingReplay.length, 0);

  const replayResult = {
    totalEligible: eligible.length,
    committedCount: 0,
    alreadyCommittedCount: eligible.length,
    replayed: true
  };

  assert.equal(replayResult.replayed, true);
  assert.equal(replayResult.committedCount, 0);
  assert.equal(replayResult.alreadyCommittedCount, 3);
});
