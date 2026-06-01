import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();

function extractRoutesFromSource(source) {
  return [...source.matchAll(/route:\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
}

const mainIndexSource = readFileSync(path.join(root, "src/main/index.ts"), "utf8");
const preloadIndexSource = readFileSync(path.join(root, "src/preload/index.ts"), "utf8");
const routeHostsSource = readFileSync(path.join(root, "src/app/registry/routeHosts.ts"), "utf8");
const mainHostsSource = readFileSync(path.join(root, "src/app/registry/mainHosts.ts"), "utf8");
const preloadHostsSource = readFileSync(path.join(root, "src/app/registry/preloadHosts.ts"), "utf8");
const appSource = readFileSync(path.join(root, "src/renderer/App.tsx"), "utf8");
const routeSource = readFileSync(path.join(root, "src/app/registry/routes.ts"), "utf8");
const appRouteUnion = [...routeSource.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

test("Main, preload och renderer hostkedjor är registrydrivna", () => {
  assert.equal(mainIndexSource.includes("buildMainHostContext"), true);
  assert.equal(/import\s+.*@features\//.test(mainIndexSource), false);
  assert.equal(/new\s+\w+Service\(/.test(mainIndexSource), false);
  assert.equal(preloadIndexSource.includes("sliceRegistry"), true);
  assert.equal(/viteImportMeta\.glob<ImportedRouteHostModule>/.test(routeHostsSource), true);
  assert.equal(/viteImportMeta\.glob<ImportedPreloadHostModule>/.test(preloadHostsSource), true);
  assert.equal(/viteImportMeta\.glob<ImportedMainHostModule>/.test(mainHostsSource), true);
});

test("Render-kedjan binder flera moduler från manifest till route-host och UI", () => {
  const featuresRoot = path.join(root, "src/features");
  const featureNames = readdirSync(featuresRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const visibleFeatureSamples = [];
  for (const featureName of featureNames) {
    try {
      const manifestSource = readFileSync(path.join(featuresRoot, featureName, "slice.manifest.ts"), "utf8");
      const hostSource = readFileSync(path.join(featuresRoot, featureName, "renderer", "routeHost.tsx"), "utf8");

      const manifestRoutes = extractRoutesFromSource(manifestSource);
      const hostRoutes = extractRoutesFromSource(hostSource);
      if (manifestRoutes.length > 0 && hostRoutes.length > 0) {
        visibleFeatureSamples.push({
          featureName,
          manifestRoutes,
          hostRoutes
        });
      }
    } catch {
      // Skip partially implemented modules in the registry walk.
    }
  }

  assert.ok(visibleFeatureSamples.length >= 3, "Expected at least three fully declared module pairs.");
  const firstThree = visibleFeatureSamples.slice(0, 3);
  for (const sample of firstThree) {
    assert.equal(Array.isArray(sample.manifestRoutes), true);
    const routeMatch = sample.manifestRoutes.find((route) => hostRoutesHasRoute(sample.hostRoutes, route));
    assert.equal(typeof routeMatch, "string", `${sample.featureName} should expose matching manifest/route host route`);
    assert.equal(appSource.includes("appNavigationTree"), true);
    assert.equal(appSource.includes("resolveRouteHost"), true);
    assert.equal(appRouteUnion.includes(routeMatch), true);
  }
});

function hostRoutesHasRoute(hostRoutes, route) {
  return hostRoutes.includes(route);
}

test("Hello-module kan simuleras via registreringskontrakt med endast manifest + route-host", () => {
  const helloManifest = `
export const sliceId = "hello-module";
export const displayName = "Hello Module";
export const moduleDocPath = "src/features/hello-module/MODULE.md";
export const ownedAreas = ["core"];
export const navigation = [{ route: "jobs", label: "Hello", sliceId: "hello-module" }];
`;
  const helloRouteHost = `
export const sliceRouteHosts = [
  { route: "jobs", render: () => null }
];
`;
  const helloManifestRoutes = extractRoutesFromSource(helloManifest);
  const helloHostRoutes = extractRoutesFromSource(helloRouteHost);

  assert.equal(helloManifestRoutes.length, 1);
  assert.equal(helloHostRoutes.length, 1);
  assert.equal(helloManifestRoutes[0], helloHostRoutes[0], "Manifest and host route must match.");
  assert.equal(appRouteUnion.includes("jobs"), true, "Hello route must be accepted by AppRouteKey.");
});
