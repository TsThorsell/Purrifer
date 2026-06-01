import type { AppRouteKey } from "./routes";
import type { SliceRouteHost } from "./routeHostTypes";
import { sliceRegistry } from "./slices";
import { generatedRouteHostModules } from "./generated/generatedRouteHostModules";

type ImportedRouteHostModule = {
  sliceRouteHosts?: SliceRouteHost[];
};

type RouteHostIssueSeverity = "warning" | "error";

type RouteHostIssueCode =
  | "INVALID_HOST_ENTRY"
  | "DUPLICATE_ROUTE"
  | "HOST_WITHOUT_MANIFEST_ROUTE"
  | "MANIFEST_ROUTE_WITHOUT_HOST";

interface SliceRouteHostIssue {
  code: RouteHostIssueCode;
  severity: RouteHostIssueSeverity;
  route: string;
  message: string;
}

export interface RouteHostDiscoveryResult {
  hosts: SliceRouteHost[];
  issues: SliceRouteHostIssue[];
}

export interface RouteHostDiscoveryOptions {
  strict?: boolean;
}

function discoverSliceRouteHosts(): SliceRouteHost[] {
  const manifestModules = generatedRouteHostModules;

  const discovered: SliceRouteHost[] = [];

  const orderedEntries = Object.entries(manifestModules).sort(([pathA], [pathB]) =>
    pathA.localeCompare(pathB)
  );
  for (const [, manifestModule] of orderedEntries) {
    const hosts = manifestModule.sliceRouteHosts;
    if (!hosts || !Array.isArray(hosts)) {
      continue;
    }
    for (const host of hosts) {
      if (typeof host?.route !== "string" || typeof host?.render !== "function") {
        continue;
      }
      discovered.push(host);
    }
  }

  return discovered;
}

function collectManifestRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const manifest of sliceRegistry) {
    for (const nav of manifest.navigation) {
      routes.add(nav.route);
    }
  }
  return routes;
}

function buildRouteHostDiagnostics(
  hostModules: SliceRouteHost[]
): RouteHostDiscoveryResult {
  const issues: SliceRouteHostIssue[] = [];
  const byRoute = new Map<AppRouteKey, SliceRouteHost>();
  const manifestRoutes = collectManifestRoutes();
  const discoveredRoutes = new Set<string>();

  for (const host of hostModules) {
    if (!host || typeof host.route !== "string" || typeof host.render !== "function") {
      issues.push({
        code: "INVALID_HOST_ENTRY",
        severity: "error",
        route: "",
        message: "Ogiltig route-host-post (saknat route eller render)."
      });
      continue;
    }

    const route = host.route;
    if (!manifestRoutes.has(route)) {
      issues.push({
        code: "HOST_WITHOUT_MANIFEST_ROUTE",
        severity: "error",
        route,
        message: `Route host "${route}" saknar ägande ruta i några manifestnavigationer.`
      });
      continue;
    }

    if (discoveredRoutes.has(route)) {
      issues.push({
        code: "DUPLICATE_ROUTE",
        severity: "error",
        route,
        message: `Route host "${route}" är registrerad flera gånger.`
      });
      continue;
    }

    discoveredRoutes.add(route);
    byRoute.set(route, host);
  }

  for (const route of manifestRoutes) {
    if (!discoveredRoutes.has(route)) {
      issues.push({
        code: "MANIFEST_ROUTE_WITHOUT_HOST",
        severity: "error",
        route,
        message: `Manifest-route "${route}" saknar host-implementation i renderer/routeHost.tsx.`
      });
    }
  }

  return {
    hosts: [...byRoute.values()],
    issues
  };
}

export function discoverRouteHosts(
  routeHosts: SliceRouteHost[] = discoverSliceRouteHosts(),
  options: RouteHostDiscoveryOptions = {}
): RouteHostDiscoveryResult {
  const result = buildRouteHostDiagnostics(routeHosts);
  const issues = result.issues;
  const fatal = issues.filter((issue) => issue.severity === "error");

  if (options.strict !== false && fatal.length > 0) {
    const message = fatal.map((issue) => `${issue.route}: ${issue.message}`).join(" | ");
    throw new Error(`Route-host validering misslyckades: ${message}`);
  }

  return result;
}

const { hosts: discoveredRouteHosts, issues: routeHostDiscoveryIssues } = discoverRouteHosts(
  undefined,
  { strict: false }
);
export { routeHostDiscoveryIssues };

if (routeHostDiscoveryIssues.some((issue) => issue.severity === "warning" || issue.severity === "error")) {
  for (const issue of routeHostDiscoveryIssues) {
    if (issue.severity === "error") {
      console.error(`[route-host] ${issue.route}: ${issue.message}`);
      continue;
    }
    console.warn(`[route-host] ${issue.route}: ${issue.message}`);
  }
}

const routeHosts = [...discoveredRouteHosts];

export function resolveRouteHost(route: AppRouteKey): SliceRouteHost | undefined {
  return routeHosts.find((host) => host.route === route);
}

export { routeHosts };
export type { SliceRouteHost };
