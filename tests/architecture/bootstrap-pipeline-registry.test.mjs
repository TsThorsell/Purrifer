import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = process.cwd();
const registryJsonPath = path.join(root, "src", "app", "registry", "bootstrapPipelineRegistry.json");
const registrySourcePath = path.join(root, "src", "app", "registry", "bootstrapPipelineRegistry.ts");
const mainIndexPath = path.join(root, "src", "main", "index.ts");
const preloadIndexPath = path.join(root, "src", "preload", "index.ts");

const registrySource = readFileSync(registrySourcePath, "utf8");
const mainSource = readFileSync(mainIndexPath, "utf8");
const preloadSource = readFileSync(preloadIndexPath, "utf8");
const registry = JSON.parse(readFileSync(registryJsonPath, "utf8"));

const requiredOrder = [
  "bootstrap-intake",
  "bootstrap-contract",
  "bootstrap-preprocess",
  "bootstrap-stage",
  "bootstrap-review",
  "bootstrap-commit",
  "bootstrap-audit",
  "bootstrap-pilot-dashboard"
];

const registryById = Object.fromEntries(registry.map((entry) => [entry.sliceId, entry]));

test("Bootstrap registry includes the full bootstrap module chain in required order", () => {
  const registryIds = registry.map((entry) => entry.sliceId);
  assert.deepStrictEqual(registryIds, requiredOrder);
});

test("Bootstrap registry posts explicit contracts and dependencies", () => {
  for (const sliceId of requiredOrder) {
    assert.equal(typeof registryById[sliceId], "object", `Expected registry entry for ${sliceId}`);
  }

  assert.equal(registryById["bootstrap-intake"].dependsOn.join(","), "bootstrap-contract");
  assert.equal(registryById["bootstrap-preprocess"].dependsOn.join(","), "bootstrap-intake,bootstrap-contract");
  assert.equal(
    registryById["bootstrap-stage"].dependsOn.join(","),
    "bootstrap-preprocess,bootstrap-contract"
  );
  assert.equal(
    registryById["bootstrap-review"].dependsOn.join(","),
    "bootstrap-stage,bootstrap-contract"
  );
  assert.equal(
    registryById["bootstrap-commit"].dependsOn.join(","),
    "bootstrap-stage,bootstrap-contract"
  );
  assert.equal(
    registryById["bootstrap-audit"].dependsOn.join(","),
    "bootstrap-stage,bootstrap-review,bootstrap-commit,bootstrap-contract"
  );
  assert.equal(
    registryById["bootstrap-pilot-dashboard"].dependsOn.join(","),
    "bootstrap-review,bootstrap-commit,bootstrap-audit,bootstrap-contract"
  );
  for (const [sliceId, entry] of Object.entries(registryById)) {
    assert.equal(Array.isArray(entry.contracts), true, `contracts missing for ${sliceId}`);
    assert.ok(entry.contracts.length > 0, `contracts empty for ${sliceId}`);
  }

  assert.equal(registryById["bootstrap-intake"].contracts.includes("RawIngestApi"), true);
  assert.equal(registryById["bootstrap-preprocess"].contracts.includes("BootstrapPreprocessApi"), true);
  assert.equal(registryById["bootstrap-stage"].contracts.includes("BootstrapStageApi"), true);
  assert.equal(registryById["bootstrap-review"].contracts.includes("BootstrapReviewApi"), true);
  assert.equal(registryById["bootstrap-commit"].contracts.includes("BootstrapCommitApi"), true);
  assert.equal(registryById["bootstrap-audit"].contracts.includes("BootstrapAuditApi"), true);
  assert.equal(registryById["bootstrap-pilot-dashboard"].contracts.includes("BootstrapPilotDashboardApi"), true);
  assert.equal(registryById["bootstrap-contract"].contracts.includes("CanonicalValidationResult"), true);
});

test("Bootstrap pipeline validation is wired into startup for strict checks", () => {
  assert.equal(registrySource.includes("validateBootstrapPipelineRegistry"), true);
  assert.equal(mainSource.includes("validateBootstrapPipelineRegistry"), true);
  assert.equal(preloadSource.includes("validateBootstrapPipelineRegistry"), true);
});

test("Bootstrap registry validator exposes startup-blocking error path", () => {
  const hasValidationErrorThrow = registrySource.includes("throw new Error(`Bootstrap pipeline-registry validation misslyckades");
  assert.equal(hasValidationErrorThrow, true);
});
