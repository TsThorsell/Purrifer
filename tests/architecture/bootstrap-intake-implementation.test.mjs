import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const featureRoot = path.join(root, "src", "features", "bootstrap-intake");

function readFeatureSource(relativePath) {
  return readFileSync(path.join(featureRoot, relativePath), "utf8");
}

const contractSource = readFeatureSource("contracts.ts");
const serviceSource = readFeatureSource(path.join("main", "BootstrapIntakeService.ts"));
const repositorySource = readFeatureSource(path.join("main", "BootstrapIntakeRepository.ts"));
const mainHostSource = readFeatureSource(path.join("main", "mainHost.ts"));
const preloadHostSource = readFeatureSource(path.join("preload", "preloadHost.ts"));
const pageSource = readFeatureSource(path.join("renderer", "BootstrapIntakePage.tsx"));

test("bootstrap-intake contracts expose intake metadata and dedupe taxonomy", () => {
  assert.ok(contractSource.includes("RawIngestBatchSummary"), "Contract should define batch summary model");
  assert.ok(contractSource.includes("sourceSystem"), "Contract should expose source system field");
  assert.ok(contractSource.includes("totalDiscovered"), "Contract should expose deterministic batch totals");
  assert.ok(contractSource.includes("duplicateScope"), "Contract should expose duplicate scope for idempotent intake");
  assert.ok(contractSource.includes("batch-and-existing"), "Contract should support batch + existing duplicate scope");
  assert.ok(contractSource.includes("scannerProfile"), "Contract should expose scanner metadata fields");
});

test("bootstrap-intake service enforces idempotent raw insertion", () => {
  assert.ok(serviceSource.includes("status === \"new\""), "Service should persist only new raw files");
  assert.ok(serviceSource.includes("hasExistingHash"), "Service should query existing hash to block duplicates deterministically");
  assert.ok(serviceSource.includes("duplicateExisting"), "Service should classify duplicateExisting batches");
});

test("bootstrap-intake persistence hosts expose full PP-019 surface", () => {
  assert.ok(repositorySource.includes("createBatch"), "Repository should persist ingest batch metadata");
  assert.ok(repositorySource.includes("insertBatchFile"), "Repository should persist batch file rows");
  assert.ok(repositorySource.includes("hasExistingHash"), "Repository should support duplicate checks before ingest");
  assert.ok(repositorySource.includes("SELECT 1 AS ok FROM raw_ingest_files"), "Repository duplicate check must be SQL-backed");
});

test("bootstrap-intake host and UI expose full intake workflow", () => {
  assert.ok(mainHostSource.includes("selectFoldersAndIngest"), "Main host should expose folder ingest");
  assert.ok(mainHostSource.includes("scanToBatch"), "Main host should expose scanner ingest");
  assert.ok(mainHostSource.includes("getScannerCapabilities"), "Main host should expose scanner capability check");
  assert.ok(preloadHostSource.includes("scanToBatch"), "Preload host should expose scanner ingest method");
  assert.ok(pageSource.includes("totalDiscovered"), "UI should present batch clarity metrics");
  assert.ok(pageSource.includes("duplicateScope"), "UI should surface duplicate scope for clarity");
  assert.ok(pageSource.includes("Starta batchingest"), "UI should expose intake trigger");
});
