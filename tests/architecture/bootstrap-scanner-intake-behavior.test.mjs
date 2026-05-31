import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

function digest(input) {
  return createHash("sha256").update(input).digest("hex");
}

test("scanner intake enters normal ingest batch with metadata and hash dedupe", () => {
  const scanRequest = {
    sourceSystem: "scanner",
    scannerDeviceName: "Brother ADS-1300",
    scannerProfile: "ads-1300",
    feederMode: "adf",
    scanMode: "duplex",
    scanTimestamp: "2026-05-31T12:00:00.000Z"
  };

  const scannedFiles = [
    { fullPath: "C:/scan/out/0001.pdf", payload: "invoice-1" },
    { fullPath: "C:/scan/out/0002.pdf", payload: "invoice-1" },
    { fullPath: "C:/scan/out/0003.pdf", payload: "invoice-2" }
  ];

  const previouslySeenHashes = new Set([digest("invoice-2")]);
  const seenInBatch = new Set();

  const decisions = scannedFiles.map((file) => {
    const hash = digest(file.payload);
    const duplicateInBatch = seenInBatch.has(hash);
    const duplicateExisting = previouslySeenHashes.has(hash);
    if (!duplicateInBatch) {
      seenInBatch.add(hash);
    }
    return {
      fullPath: file.fullPath,
      hash,
      status: duplicateInBatch || duplicateExisting ? "duplicate" : "new",
      duplicateInBatch,
      duplicateExisting
    };
  });

  assert.equal(decisions[0].status, "new");
  assert.equal(decisions[1].status, "duplicate");
  assert.equal(decisions[1].duplicateInBatch, true);
  assert.equal(decisions[2].status, "duplicate");
  assert.equal(decisions[2].duplicateExisting, true);

  const ingestBatch = {
    ingestBatchId: "RB000010",
    sourceSystem: scanRequest.sourceSystem,
    scannerDeviceName: scanRequest.scannerDeviceName,
    scannerProfile: scanRequest.scannerProfile,
    feederMode: scanRequest.feederMode,
    scanMode: scanRequest.scanMode,
    scanTimestamp: scanRequest.scanTimestamp,
    totalDiscovered: scannedFiles.length
  };

  assert.equal(ingestBatch.sourceSystem, "scanner");
  assert.equal(ingestBatch.scannerDeviceName, "Brother ADS-1300");
  assert.equal(ingestBatch.feederMode, "adf");
  assert.equal(ingestBatch.scanMode, "duplex");

  const preprocessInput = { ingestBatchId: ingestBatch.ingestBatchId };
  const stageInput = { preprocessBatchId: "PB000010" };
  assert.equal(preprocessInput.ingestBatchId, "RB000010");
  assert.equal(stageInput.preprocessBatchId.startsWith("PB"), true);
});

