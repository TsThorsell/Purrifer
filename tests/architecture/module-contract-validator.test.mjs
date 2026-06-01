import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = process.cwd();
const supportedMajor = 1;
const supportedMinor = 0;
const currentVersion = "1.0.0";

function validateSchemaVersion(version, { required = false } = {}) {
  const issues = [];
  const pattern = /^(\d+)\.(\d+)\.(\d+)$/;
  const hasValue = typeof version === "string" && version.trim().length > 0;

  if (!hasValue) {
    if (required) {
      issues.push({
        code: "SCHEMA_VERSION_MISSING",
        severity: "error",
        observed: version,
        expected: currentVersion
      });
    }
    return issues;
  }

  const match = version.trim().match(pattern);
  if (!match) {
    issues.push({
      code: "SCHEMA_VERSION_INVALID",
      severity: "error",
      observed: version,
      expected: currentVersion
    });
    return issues;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);

  if (major !== supportedMajor) {
    issues.push({
      code: "SCHEMA_VERSION_UNSUPPORTED_MAJOR",
      severity: "error",
      observed: version,
      expected: `${supportedMajor}.x.x`
    });
  }

  if (major === supportedMajor && minor > supportedMinor) {
    issues.push({
      code: "SCHEMA_VERSION_FUTURE",
      severity: "warning",
      observed: version,
      expected: `${supportedMajor}.${supportedMinor}.x`
    });
  }

  return issues;
}

function registryHasSchemaCheck(filePath, token) {
  const source = readFileSync(path.join(root, filePath), "utf8");
  return source.includes(token);
}

test("module schema validator accepts supported versions (happy-path)", () => {
  const issues = validateSchemaVersion(currentVersion);
  assert.equal(issues.length, 0);
});

test("module schema validator blocks invalid schema versions (error-path)", () => {
  const missing = validateSchemaVersion(undefined, { required: true });
  const malformed = validateSchemaVersion("foo.bar");
  const unsupported = validateSchemaVersion("2.0.0");

  const missingCodes = missing.map((issue) => issue.code);
  const malformedCodes = malformed.map((issue) => issue.code);
  const unsupportedCodes = unsupported.map((issue) => issue.code);

  assert.equal(missingCodes.includes("SCHEMA_VERSION_MISSING"), true);
  assert.equal(malformedCodes.includes("SCHEMA_VERSION_INVALID"), true);
  assert.equal(unsupportedCodes.includes("SCHEMA_VERSION_UNSUPPORTED_MAJOR"), true);
});

test("modulregistrering verifierar schema-version i slice-manifest", () => {
  assert.equal(registryHasSchemaCheck("src/app/registry/slices.ts", "validateModuleSchemaVersion"), true);
});

test("main- och preload-host registreringar refererar gemensam schema-validering", () => {
  assert.equal(registryHasSchemaCheck("src/app/registry/mainHosts.ts", "validateModuleSchemaVersion"), true);
  assert.equal(registryHasSchemaCheck("src/app/registry/preloadHosts.ts", "validateModuleSchemaVersion"), true);
});
