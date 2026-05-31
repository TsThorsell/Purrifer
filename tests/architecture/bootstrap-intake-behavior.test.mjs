import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

function digest(input) {
  return createHash("sha256").update(input).digest("hex");
}

test("bootstrap intake batch creation and deterministic hash dedupe", () => {
  const sourceSystem = "manual-folder-import";
  const createdAt = "2026-05-31T10:00:00.000Z";

  const files = [
    { fullPath: "C:/inbox/a.pdf", payload: "same-content" },
    { fullPath: "C:/inbox/b.pdf", payload: "same-content" },
    { fullPath: "C:/inbox/c.pdf", payload: "unique-content" }
  ];

  const previouslySeenHashes = new Set([digest("unique-content")]);
  const seenInBatch = new Set();

  const result = files.map((file) => {
    const hash = digest(file.payload);
    const duplicateInBatch = seenInBatch.has(hash);
    const duplicateExisting = previouslySeenHashes.has(hash);

    const status = duplicateInBatch || duplicateExisting ? "duplicate" : "new";
    if (!duplicateInBatch) {
      seenInBatch.add(hash);
    }

    return {
      fullPath: file.fullPath,
      hash,
      status,
      duplicateInBatch,
      duplicateExisting
    };
  });

  const batch = {
    ingestBatchId: "RB000001",
    sourceSystem,
    createdAt,
    totalDiscovered: result.length,
    totalNew: result.filter((entry) => entry.status === "new").length,
    totalDuplicates: result.filter((entry) => entry.status === "duplicate").length
  };

  assert.equal(batch.ingestBatchId.startsWith("RB"), true);
  assert.equal(batch.sourceSystem, sourceSystem);
  assert.equal(batch.totalDiscovered, 3);

  assert.equal(result[0].hash, digest("same-content"));
  assert.equal(result[1].hash, digest("same-content"));
  assert.equal(result[0].hash, result[1].hash);

  assert.equal(result[0].status, "new");
  assert.equal(result[1].status, "duplicate");
  assert.equal(result[1].duplicateInBatch, true);
  assert.equal(result[2].status, "duplicate");
  assert.equal(result[2].duplicateExisting, true);
  assert.equal(batch.totalNew, 1);
  assert.equal(batch.totalDuplicates, 2);

  const persistedByHashAndBatch = new Set();
  for (const entry of result) {
    const key = `${batch.ingestBatchId}::${entry.hash}`;
    if (persistedByHashAndBatch.has(key)) {
      continue;
    }
    persistedByHashAndBatch.add(key);
  }
  assert.equal(persistedByHashAndBatch.size, 2);
});
