import { existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

const root = process.cwd();
const requiredSlices = [
  "shell-core",
  "document-inbox",
  "document-review",
  "search-and-index",
  "reports-lite",
  "retirement-baseline",
  "holdings-and-events",
  "transaction-import",
  "bootstrap-intake",
  "bootstrap-preprocess",
  "bootstrap-stage",
  "bootstrap-review",
  "bootstrap-commit",
  "bootstrap-audit",
  "bootstrap-pilot-dashboard",
  "bootstrap-contract",
  "entity-registry",
  "invoice-and-payment",
  "obligations-and-cases",
  "voucher-and-proof"
];

for (const sliceName of requiredSlices) {
  test(`${sliceName} has a manifest`, () => {
    const manifestPath = path.join(root, "src", "features", sliceName, "slice.manifest.ts");
    assert.equal(existsSync(manifestPath), true);
  });

  test(`${sliceName} has a module doc`, () => {
    const docPath = path.join(root, "src", "features", sliceName, "MODULE.md");
    assert.equal(existsSync(docPath), true);
  });
}

test("core entrypoints exist", () => {
  const entrypoints = [
    path.join(root, "src", "main", "index.ts"),
    path.join(root, "src", "preload", "index.ts"),
    path.join(root, "src", "renderer", "main.tsx")
  ];

  for (const entrypoint of entrypoints) {
    assert.equal(existsSync(entrypoint), true);
  }
});

test("renderer cannot import forbidden direct system modules", () => {
  const rendererRoot = path.join(root, "src", "renderer");
  const appSource = readFileSync(path.join(rendererRoot, "App.tsx"), "utf8");
  const preloadSource = readFileSync(path.join(root, "src", "preload", "index.ts"), "utf8");
  const forbiddenPatterns = [/node:fs/, /node:sqlite/, /child_process/];

  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(appSource), false, `Forbidden pattern found in renderer App.tsx: ${pattern}`);
    assert.equal(pattern.test(preloadSource), false, `Forbidden pattern found in preload: ${pattern}`);
  }
});

