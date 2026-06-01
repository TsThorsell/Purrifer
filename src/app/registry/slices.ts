import type { AppNavigationItem, AppRouteKey } from "./routes";
import {
  validateModuleSchemaVersion
} from "@app/registry/moduleSchema";
import { generatedSliceManifestModules } from "./generated/generatedSliceManifestModules";
import type { AppNavigationTreeItem, SliceManifest } from "./sliceManifestTypes";

type IssueSeverity = "warning" | "error";

type SliceDiscoveryIssueCode =
  | "DUPLICATE_SLICE_ID"
  | "EMPTY_SLICE_ID"
  | "EMPTY_DISPLAY_NAME"
  | "EMPTY_MODULE_DOC_PATH"
  | "EMPTY_OWNED_AREAS"
  | "EMPTY_NAVIGATION_SLICE_ID"
  | "DUPLICATE_NAVIGATION_ROUTE"
  | "INVALID_NAVIGATION_ENTRY"
  | "MANIFEST_EXPORT_NOT_FOUND"
  | "INVALID_NAVIGATION_PERMISSIONS"
  | "INVALID_NAVIGATION_PARENT_ROUTE"
  | "INVALID_NAVIGATION_TITLE"
  | "SCHEMA_VERSION_MISSING"
  | "SCHEMA_VERSION_INVALID"
  | "SCHEMA_VERSION_UNSUPPORTED_MAJOR"
  | "SCHEMA_VERSION_FUTURE";

interface SliceDiscoveryIssue {
  code: SliceDiscoveryIssueCode;
  severity: IssueSeverity;
  sliceId: string;
  route?: string;
  observed?: string;
  expected?: string;
  message: string;
}

export interface SliceDiscoveryResult {
  slices: SliceManifest[];
  appNavigation: AppNavigationItem[];
  appNavigationTree: AppNavigationTreeItem[];
  issues: SliceDiscoveryIssue[];
}

export interface SliceDiscoveryOptions {
  strict?: boolean;
}

type ManifestModule = Record<string, unknown>;

const navigationRouteValues: readonly AppRouteKey[] = [
  "landing",
  "search",
  "reports-lite",
  "retirement-baseline",
  "transaction-import",
  "bootstrap-intake",
  "bootstrap-preprocess",
  "bootstrap-stage",
  "bootstrap-review",
  "bootstrap-commit",
  "bootstrap-audit",
  "bootstrap-pilot-dashboard",
  "holdings-and-events",
  "document-inbox",
  "document-review",
  "entity-registry",
  "invoice-and-payment",
  "obligations-and-cases",
  "vouchers",
  "jobs",
  "settings"
];

const routeIconByRoute: Record<string, string> = {
  landing: "🏠",
  search: "🔎",
  "reports-lite": "📊",
  "retirement-baseline": "🧾",
  "transaction-import": "📥",
  "bootstrap-intake": "📦",
  "bootstrap-preprocess": "🧪",
  "bootstrap-stage": "🧩",
  "bootstrap-review": "✅",
  "bootstrap-commit": "🛠",
  "bootstrap-audit": "🧭",
  "bootstrap-pilot-dashboard": "📈",
  "holdings-and-events": "📈",
  "document-inbox": "📨",
  "document-review": "🧠",
  "entity-registry": "📂",
  "invoice-and-payment": "💳",
  "obligations-and-cases": "⚖️",
  vouchers: "🧾",
  jobs: "⚙️",
  settings: "🧩"
};

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isKnownRoute(value: unknown): value is AppRouteKey {
  const route = normalizeText(value);
  return route !== undefined && navigationRouteValues.includes(route as AppRouteKey);
}

function isNavigationObject(value: unknown): value is AppNavigationItem {
  return value !== null && typeof value === "object";
}

function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeNavigationEntry(
  manifest: SliceManifest,
  navItem: AppNavigationItem,
  fallbackLabel: string
): AppNavigationItem {
  const label = normalizeText(navItem.label) ?? fallbackLabel;
  const title = normalizeText((navItem as AppNavigationItem & { title?: unknown }).title) ?? label;
  const route = navItem.route;
  const permissions = normalizePermissions((navItem as AppNavigationItem & { permissions?: unknown }).permissions);
  const icon =
    normalizeText((navItem as AppNavigationItem & { icon?: unknown }).icon) ??
    routeIconByRoute[route] ??
    "🧩";
  const parentRouteValue = (navItem as AppNavigationItem & { parentRoute?: unknown }).parentRoute;
  const parentRoute = isKnownRoute(parentRouteValue) ? parentRouteValue : undefined;

  return {
    ...navItem,
    sliceId: manifest.sliceId,
    route,
    label,
    title,
    icon,
    permissions,
    parentRoute
  };
}

function isLikelySliceManifest(value: unknown): value is SliceManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<SliceManifest>;
  return (
    typeof manifest.sliceId === "string" &&
    typeof manifest.displayName === "string" &&
    typeof manifest.moduleDocPath === "string" &&
    Array.isArray(manifest.ownedAreas) &&
    Array.isArray(manifest.navigation)
  );
}

function discoverSliceManifestModules(): SliceManifest[] {
  const manifestModules = generatedSliceManifestModules;

  const discovered: SliceManifest[] = [];

  const orderedEntries = Object.entries(manifestModules).sort(([pathA], [pathB]) =>
    pathA.localeCompare(pathB)
  );
  for (const [, manifestModule] of orderedEntries) {
    let candidate: SliceManifest | null = null;
    for (const exportedValue of Object.values(manifestModule as Record<string, unknown>)) {
      if (isLikelySliceManifest(exportedValue)) {
        candidate = exportedValue;
        break;
      }
    }
    if (candidate) {
      discovered.push(candidate);
    }
  }

  return discovered;
}

export const rawSliceManifests: SliceManifest[] = discoverSliceManifestModules();

function buildNavigation(manifests: SliceManifest[]): AppNavigationItem[] {
  return manifests.flatMap((manifest, manifestIndex) =>
    manifest.navigation
      .filter(isNavigationObject)
      .map((navItem) => {
      const fallbackLabel = `${manifest.sliceId} route ${manifestIndex + 1}`;
      return normalizeNavigationEntry(manifest, navItem, fallbackLabel);
    })
  );
}

function buildNavigationTree(navigation: AppNavigationItem[]): AppNavigationTreeItem[] {
  const nodes = new Map<string, AppNavigationTreeItem>();
  const ordered = navigation.map((item) => ({
    ...item,
    children: [] as AppNavigationTreeItem[]
  }));
  for (const node of ordered) {
    nodes.set(node.route, node);
  }

  const roots: AppNavigationTreeItem[] = [];
  for (const node of ordered) {
    const parentRoute = node.parentRoute;
    const parentNode = parentRoute ? nodes.get(parentRoute) : undefined;
    if (parentNode && parentNode.route !== node.route) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function isValidSliceManifest(manifest: SliceManifest, index: number): SliceDiscoveryIssue[] {
  const issues: SliceDiscoveryIssue[] = [];
  const schemaIssues = validateModuleSchemaVersion("slice-manifest", manifest.sliceId, manifest.schemaVersion);

  for (const issue of schemaIssues) {
    issues.push({
      code: issue.code,
      severity: issue.severity,
      sliceId: issue.sliceId,
      route: undefined,
      message: issue.message,
      observed: issue.observed,
      expected: issue.expected
    });
  }

  if (!manifest.sliceId || manifest.sliceId.trim().length === 0) {
    issues.push({
      code: "EMPTY_SLICE_ID",
      severity: "error",
      sliceId: `index-${index}`,
      message: "Slice-id får inte vara tom."
    });
    return issues;
  }

  if (!manifest.displayName || manifest.displayName.trim().length === 0) {
    issues.push({
      code: "EMPTY_DISPLAY_NAME",
      severity: "error",
      sliceId: manifest.sliceId,
      message: "DisplayName får inte vara tom."
    });
  }

  if (!manifest.moduleDocPath || manifest.moduleDocPath.trim().length === 0) {
    issues.push({
      code: "EMPTY_MODULE_DOC_PATH",
      severity: "warning",
      sliceId: manifest.sliceId,
      message: "moduleDocPath saknar värde."
    });
  }

  if (!manifest.ownedAreas || manifest.ownedAreas.length === 0) {
    issues.push({
      code: "EMPTY_OWNED_AREAS",
      severity: "warning",
      sliceId: manifest.sliceId,
      message: "ownedAreas är tomt; fyll i minst ett område."
    });
  }

  manifest.navigation.forEach((item, itemIndex) => {
    if (!isNavigationObject(item)) {
      issues.push({
        code: "INVALID_NAVIGATION_ENTRY",
        severity: "error",
        sliceId: manifest.sliceId,
        message: `Navigation entry #${itemIndex + 1} saknar giltigt route/label-objekt.`
      });
      return;
    }

    const routeValue = normalizeText((item as AppNavigationItem & { route?: unknown }).route);
    const labelValue = normalizeText((item as AppNavigationItem & { label?: unknown }).label);
    const sliceId = normalizeText((item as AppNavigationItem & { sliceId?: unknown }).sliceId);

    if (!routeValue || !labelValue) {
      issues.push({
        code: "INVALID_NAVIGATION_ENTRY",
        severity: "error",
        sliceId: manifest.sliceId,
        route: routeValue,
        message: "Navigation entry saknar giltigt route/label."
      });
      return;
    }

    if (!isKnownRoute(routeValue)) {
      issues.push({
        code: "INVALID_NAVIGATION_ENTRY",
        severity: "error",
        sliceId: manifest.sliceId,
        route: routeValue,
        message: `Navigation route "${routeValue}" matchar inte AppRouteKey.`
      });
      return;
    }

    if (sliceId !== manifest.sliceId) {
      issues.push({
        code: "EMPTY_NAVIGATION_SLICE_ID",
        severity: "error",
        sliceId: manifest.sliceId,
        route: routeValue,
        message: `Navigation item sliceId måste vara ${manifest.sliceId}.`
      });
    }

    if (
      (item as AppNavigationItem & { permissions?: unknown }).permissions !== undefined &&
      !Array.isArray((item as AppNavigationItem & { permissions?: unknown }).permissions)
    ) {
      issues.push({
        code: "INVALID_NAVIGATION_PERMISSIONS",
        severity: "warning",
        sliceId: manifest.sliceId,
        route: item.route,
        message: "navigation.permissions ska vara en sträng-array om den anges."
      });
    }

    const parentRouteValue = (item as AppNavigationItem & { parentRoute?: unknown }).parentRoute;
    if (parentRouteValue !== undefined && !isKnownRoute(parentRouteValue)) {
      issues.push({
        code: "INVALID_NAVIGATION_PARENT_ROUTE",
        severity: "warning",
        sliceId: manifest.sliceId,
        route: routeValue,
        message: "navigation.parentRoute är inte ett känt route-värde."
      });
    }

    const titleValue = normalizeText((item as AppNavigationItem & { title?: unknown }).title);
    if (titleValue !== undefined && titleValue.length === 0) {
      issues.push({
        code: "INVALID_NAVIGATION_TITLE",
        severity: "warning",
        sliceId: manifest.sliceId,
        route: item.route,
        message: "navigation.title får inte vara tom."
      });
    }
  });

  return issues;
}

function buildDiagnostics(
  manifests: SliceManifest[]
): { slices: SliceManifest[]; appNavigation: AppNavigationItem[]; appNavigationTree: AppNavigationTreeItem[]; issues: SliceDiscoveryIssue[] } {
  const issues: SliceDiscoveryIssue[] = [];
  const seenSliceIds = new Set<string>();
  const seenRoutes = new Map<string, string>();

  const validated: SliceManifest[] = [];

  manifests.forEach((manifest, index) => {
    const manifestIssues = isValidSliceManifest(manifest, index);
    issues.push(...manifestIssues);

    const hasFatal = manifestIssues.some((issue) => issue.severity === "error");
    if (hasFatal) {
      return;
    }

    if (seenSliceIds.has(manifest.sliceId)) {
      issues.push({
        code: "DUPLICATE_SLICE_ID",
        severity: "error",
        sliceId: manifest.sliceId,
        message: `Slice-id ${manifest.sliceId} används flera gånger.`
      });
      return;
    }

    manifest.navigation.forEach((item) => {
      if (isKnownRoute(item.route) && seenRoutes.has(item.route)) {
        const existing = seenRoutes.get(item.route);
        if (existing) {
          issues.push({
            code: "DUPLICATE_NAVIGATION_ROUTE",
            severity: "error",
            sliceId: manifest.sliceId,
            route: item.route,
            message: `Route ${item.route} används av både ${existing} och ${manifest.sliceId}.`
          });
        }
      }

      seenRoutes.set(item.route, manifest.sliceId);
    });

    seenSliceIds.add(manifest.sliceId);
    validated.push(manifest);
  });

  const appNavigation = buildNavigation(validated).filter((item, index, list) => {
    return list.findIndex((candidate) => candidate.route === item.route) === index;
  });
  const appNavigationTree = buildNavigationTree(appNavigation);

  return { slices: validated, appNavigation, appNavigationTree, issues };
}

export function discoverSlices(
  manifests: SliceManifest[] = rawSliceManifests,
  options: SliceDiscoveryOptions = {}
): SliceDiscoveryResult {
  const result = buildDiagnostics(manifests);
  const slices = result.slices;
  const issues = result.issues;
  const appNavigation = result.appNavigation;
  const appNavigationTree = result.appNavigationTree;

  const fatalIssues = issues.filter((issue) => issue.severity === "error");
  if (options.strict !== false && fatalIssues.length > 0) {
    const message = fatalIssues
      .map((issue) => `${issue.sliceId}: ${issue.message}`)
      .join(" | ");
    throw new Error(`Slice-manifest validering misslyckades: ${message}`);
  }

  return { slices, appNavigation, appNavigationTree, issues };
}

const {
  slices: discoveredSlices,
  appNavigation,
  appNavigationTree,
  issues: discoveryIssues
} = discoverSlices(rawSliceManifests, { strict: process.env.NODE_ENV !== "test" });

export const sliceRegistry: SliceManifest[] = discoveredSlices;
export { appNavigation, appNavigationTree };
export const sliceDiscoveryIssues = discoveryIssues;

if (sliceDiscoveryIssues.some((issue) => issue.severity === "warning")) {
  for (const issue of sliceDiscoveryIssues.filter((item) => item.severity === "warning")) {
    console.warn(`[slice-registry] ${issue.sliceId}: ${issue.message}`);
  }
}
