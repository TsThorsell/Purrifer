import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

const root = process.cwd();
const featuresRoot = path.join(root, "src", "features");
const routeHostsGlob = path.join(featuresRoot, "*/renderer/routeHost.tsx");
const sliceManifestPath = (slice) => path.join(featuresRoot, slice, "slice.manifest.ts");

function listFeatureFolders() {
  return readdirSync(featuresRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function extractRoutesFromSource(source) {
  return [...source.matchAll(/route:\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
}

function collectRouteUnionFromSource(source) {
  const routeTypeBlockMatch = source.match(/export type AppRouteKey[\s\S]*?=([\s\S]*?);/);
  if (!routeTypeBlockMatch) {
    return [];
  }

  return [...routeTypeBlockMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const featureNames = listFeatureFolders();

const manifestRoutes = new Map();
for (const featureName of featureNames) {
  const manifestFile = sliceManifestPath(featureName);
  if (!existsSync(manifestFile)) {
    continue;
  }

  const manifestText = readFileSync(manifestFile, "utf8");
  const routes = extractRoutesFromSource(manifestText);
  for (const route of routes) {
    manifestRoutes.set(route, true);
  }
}

const routeHostFiles = featureNames
  .map((featureName) => path.join(featuresRoot, featureName, "renderer", "routeHost.tsx"))
  .filter((filePath) => existsSync(filePath));
const hostRoutes = new Map();
for (const filePath of routeHostFiles) {
  const hostSource = readFileSync(filePath, "utf8");
  const routes = extractRoutesFromSource(hostSource);
  for (const route of routes) {
    const existing = hostRoutes.get(route);
    if (existing) {
      hostRoutes.set(route, [...existing, filePath]);
      continue;
    }
    hostRoutes.set(route, [filePath]);
  }
}

const appRouteSource = readFileSync(path.join(root, "src", "app", "registry", "routes.ts"), "utf8");
const routeTypeRoutes = collectRouteUnionFromSource(appRouteSource);

test("All navigation routes in manifests have route hosts", () => {
  for (const [route] of manifestRoutes) {
    assert.ok(
      hostRoutes.has(route),
      `Missing route host for manifest route "${route}". Add renderer/routeHost.tsx in the owning slice.`
    );
  }
});

test("All route hosts are declared by a manifest route", () => {
  for (const [route, owners] of hostRoutes) {
    assert.ok(
      manifestRoutes.has(route),
      `Orphaned route host "${route}" from ${owners.join(", ")}; add route to owning manifest navigation.`
    );
  }
});

test("All AppRouteKey entries are covered by route hosts", () => {
  for (const route of routeTypeRoutes) {
    assert.ok(hostRoutes.has(route), `AppRouteKey route "${route}" is missing a route host.`);
  }
});

test("No duplicate route host definitions", () => {
  for (const [route, owners] of hostRoutes) {
    assert.equal(
      owners.length,
      1,
      `Route "${route}" has multiple hosts: ${owners.join(", ")}`
    );
  }
});

