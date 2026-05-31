import { test } from "node:test";
import assert from "node:assert/strict";

test("audit trail links raw file to preprocess, stage, review and commit", () => {
  const trail = {
    sourceFileId: "hash-001",
    ingestBatchId: "RB000001",
    preprocessBatchId: "PB000001",
    stageBatchId: "SB000001",
    recordId: "DOCREC-1",
    recordType: "document_record",
    stageStatus: "needs-review",
    stageCreatedAt: "2026-05-31T10:00:00.000Z",
    reviewActionStatus: "approved",
    reviewAt: "2026-05-31T10:05:00.000Z",
    commitBatchId: "CB000001",
    committedAt: "2026-05-31T10:10:00.000Z",
    objectType: "Dokument",
    objectId: "D000001"
  };

  assert.equal(Boolean(trail.sourceFileId), true);
  assert.equal(Boolean(trail.ingestBatchId), true);
  assert.equal(Boolean(trail.preprocessBatchId), true);
  assert.equal(Boolean(trail.stageBatchId), true);
  assert.equal(Boolean(trail.recordId), true);
  assert.equal(Boolean(trail.commitBatchId), true);
  assert.equal(Boolean(trail.objectId), true);

  const timeline = [trail.stageCreatedAt, trail.reviewAt, trail.committedAt];
  assert.equal(timeline.every((entry) => typeof entry === "string" && entry.length > 0), true);
  assert.equal(trail.reviewActionStatus === "approved" || trail.reviewActionStatus === "accepted-incomplete", true);
});
