import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("landing page contains preload guard before deviation API call", () => {
  const filePath = path.join(process.cwd(), "src", "features", "shell-core", "renderer", "LandingPage.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.equal(source.includes("const listDeviationCases = purriferApi?.obligationsAndCases?.listDeviationCases;"), true);
  assert.equal(source.includes("if (!listDeviationCases)"), true);
  assert.equal(source.includes("Preload API kunde inte laddas"), true);
});
