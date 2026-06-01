import type { SliceManifest } from "./sliceManifestTypes";
import rawBootstrapPipelineRegistry from "./bootstrapPipelineRegistry.json";

export interface BootstrapPipelineRegistryEntry {
  sliceId: string;
  displayName: string;
  moduleDocPath: string;
  ownedAreas: string[];
  navigationRoutes: string[];
  contracts: string[];
  dependsOn: string[];
}

export type BootstrapPipelineIssueSeverity = "warning" | "error";

export type BootstrapPipelineIssueCode =
  | "MISSING_REQUIRED_BOOTSTRAP_MODULE"
  | "INVALID_ENTRY_TYPE"
  | "EMPTY_SLICE_ID"
  | "EMPTY_DISPLAY_NAME"
  | "EMPTY_MODULE_DOC_PATH"
  | "EMPTY_DEPENDENCY"
  | "SELF_DEPENDENCY"
  | "DUPLICATE_DEPENDENCY"
  | "MISSING_DEPENDENCY"
  | "DEPENDENCY_ORDER_VIOLATION"
  | "EMPTY_CONTRACTS"
  | "EMPTY_OWNED_AREAS"
  | "OWNED_AREAS_MISMATCH"
  | "DISPLAY_NAME_MISMATCH"
  | "MODULE_DOC_PATH_MISMATCH"
  | "ROUTE_MISMATCH"
  | "SCHEMA_MISMATCH";

export interface BootstrapPipelineRegistryIssue {
  code: BootstrapPipelineIssueCode;
  severity: BootstrapPipelineIssueSeverity;
  sliceId: string;
  message: string;
}

export interface BootstrapPipelineRegistryValidationResult {
  entries: readonly BootstrapPipelineRegistryEntry[];
  issues: BootstrapPipelineRegistryIssue[];
}

export interface BootstrapPipelineRegistryValidationOptions {
  manifests?: readonly SliceManifest[];
  strict?: boolean;
}

export const bootstrapPipelineRegistry = rawBootstrapPipelineRegistry as readonly BootstrapPipelineRegistryEntry[];

export const requiredBootstrapPipelineSliceIds = [
  "bootstrap-intake",
  "bootstrap-contract",
  "bootstrap-preprocess",
  "bootstrap-stage",
  "bootstrap-review",
  "bootstrap-commit",
  "bootstrap-audit",
  "bootstrap-pilot-dashboard"
];

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value): value is string => value.length > 0);
}

function routeListFromManifest(manifest: SliceManifest): string[] {
  return normalizeStringList(manifest.navigation.map((entry) => entry.route));
}

function toOrderedSet(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function pushIssue(
  issues: BootstrapPipelineRegistryIssue[],
  code: BootstrapPipelineIssueCode,
  severity: BootstrapPipelineIssueSeverity,
  sliceId: string,
  message: string
) {
  issues.push({ code, severity, sliceId, message });
}

export function validateBootstrapPipelineRegistry(options: BootstrapPipelineRegistryValidationOptions = {}): BootstrapPipelineRegistryValidationResult {
  const manifests = options.manifests ?? [];
  const strict = options.strict ?? process.env.NODE_ENV !== "test";

  const issues: BootstrapPipelineRegistryIssue[] = [];
  const entries = bootstrapPipelineRegistry ?? [];

  if (!Array.isArray(entries)) {
    issues.push({
      code: "INVALID_ENTRY_TYPE",
      severity: "error",
      sliceId: "registry",
      message: "bootstrapPipelineRegistry måste vara en array."
    });
    if (strict) {
      throw new Error("Bootstrap pipeline-registret har ogiltig struktur.");
    }
    return { entries: [], issues };
  }

  const byId = new Map<string, BootstrapPipelineRegistryEntry>();
  const seenRegistrySliceIds = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      pushIssue(issues, "INVALID_ENTRY_TYPE", "error", "registry", "Bootstrap pipeline entry saknas.");
      continue;
    }

    if (!entry.sliceId || typeof entry.sliceId !== "string" || entry.sliceId.trim().length === 0) {
      pushIssue(issues, "EMPTY_SLICE_ID", "error", "registry", "Bootstrap pipeline entry saknar sliceId.");
      continue;
    }

    const sliceId = entry.sliceId.trim();
    if (seenRegistrySliceIds.has(sliceId)) {
      pushIssue(
        issues,
        "SCHEMA_MISMATCH",
        "error",
        sliceId,
        `Bootstrap-registret innehåller dubblett för ${sliceId}.`
      );
      continue;
    }
    seenRegistrySliceIds.add(sliceId);

    if (!Array.isArray(entry.contracts) || entry.contracts.length === 0) {
      pushIssue(issues, "EMPTY_CONTRACTS", "error", sliceId, "Inga kontrakt angivna för bootstrap-modul.");
    }
    if (entry.ownedAreas === undefined || !Array.isArray(entry.ownedAreas) || entry.ownedAreas.length === 0) {
      pushIssue(issues, "EMPTY_OWNED_AREAS", "error", sliceId, "ownedAreas får inte vara tom.");
    }

    if (!entry.displayName || typeof entry.displayName !== "string" || entry.displayName.trim().length === 0) {
      pushIssue(issues, "EMPTY_DISPLAY_NAME", "error", sliceId, "displayName får inte vara tom.");
    }

    if (!entry.moduleDocPath || typeof entry.moduleDocPath !== "string" || entry.moduleDocPath.trim().length === 0) {
      pushIssue(issues, "EMPTY_MODULE_DOC_PATH", "error", sliceId, "moduleDocPath får inte vara tom.");
    }

    if (!entry.dependsOn || !Array.isArray(entry.dependsOn)) {
      pushIssue(issues, "MISSING_DEPENDENCY", "error", sliceId, "dependsOn måste vara en array.");
    }

    byId.set(sliceId, entry);
  }

  const indexById = new Map<string, number>();
  entries.forEach((entry, index) => {
    if (entry?.sliceId && typeof entry.sliceId === "string") {
      indexById.set(entry.sliceId, index);
    }
  });

  for (const entry of entries) {
    if (!entry || typeof entry.sliceId !== "string") {
      continue;
    }

    const dependencies = normalizeStringList(entry.dependsOn);
    const seenDependencies = new Set<string>();
    for (const dependency of dependencies) {
      if (dependency === entry.sliceId) {
        pushIssue(
          issues,
          "SELF_DEPENDENCY",
          "error",
          entry.sliceId,
          `bootstrap-modul ${entry.sliceId} får inte bero på sig själv.`
        );
        continue;
      }

      if (seenDependencies.has(dependency)) {
        pushIssue(
          issues,
          "DUPLICATE_DEPENDENCY",
          "error",
          entry.sliceId,
          `Dubbelt beroende upptäckt: ${dependency} i ${entry.sliceId}.`
        );
      } else {
        seenDependencies.add(dependency);
      }

      if (!indexById.has(dependency)) {
        pushIssue(
          issues,
          "MISSING_DEPENDENCY",
          "error",
          entry.sliceId,
          `Kräver saknad bootstrap-modul ${dependency}.`
        );
        continue;
      }

      const dependencyIndex = indexById.get(dependency);
      const entryIndex = indexById.get(entry.sliceId);
      if (dependencyIndex !== undefined && entryIndex !== undefined && dependencyIndex > entryIndex) {
        pushIssue(
          issues,
          "DEPENDENCY_ORDER_VIOLATION",
          "error",
          entry.sliceId,
          `${dependency} måste registreras före ${entry.sliceId}.`
        );
      }
    }

    const manifest = manifests.find((source) => source?.sliceId === entry.sliceId);
    if (!manifest) {
      pushIssue(
        issues,
        "SCHEMA_MISMATCH",
        "error",
        entry.sliceId,
        `Slice-manifest saknas för ${entry.sliceId}.`
      );
      continue;
    }

    const manifestNavigationRoutes = toOrderedSet(routeListFromManifest(manifest));
    const registryNavigationRoutes = toOrderedSet(normalizeStringList(entry.navigationRoutes));
    if (!arraysEqual(manifestNavigationRoutes, registryNavigationRoutes)) {
      pushIssue(
        issues,
        "ROUTE_MISMATCH",
        "error",
        entry.sliceId,
        `Navigation-rutter matchar inte manifest för ${entry.sliceId}.`
      );
    }

    if (entry.displayName.trim() !== manifest.displayName.trim()) {
      pushIssue(
        issues,
        "DISPLAY_NAME_MISMATCH",
        "warning",
        entry.sliceId,
        `displayName skiljer sig från manifest för ${entry.sliceId}.`
      );
    }

    if (entry.moduleDocPath.trim() !== manifest.moduleDocPath.trim()) {
      pushIssue(
        issues,
        "MODULE_DOC_PATH_MISMATCH",
        "warning",
        entry.sliceId,
        `moduleDocPath skiljer sig från manifest för ${entry.sliceId}.`
      );
    }

    const manifestOwnedAreas = toOrderedSet(normalizeStringList(manifest.ownedAreas));
    const registryOwnedAreas = toOrderedSet(normalizeStringList(entry.ownedAreas));
    if (!arraysEqual(manifestOwnedAreas, registryOwnedAreas)) {
      pushIssue(
        issues,
        "OWNED_AREAS_MISMATCH",
        "warning",
        entry.sliceId,
        `ownedAreas skiljer sig från manifest för ${entry.sliceId}.`
      );
    }
  }

  const hasRequiredModules = requiredBootstrapPipelineSliceIds.every((sliceId) => byId.has(sliceId));
  if (!hasRequiredModules) {
    for (const sliceId of requiredBootstrapPipelineSliceIds) {
      if (!byId.has(sliceId)) {
        pushIssue(
          issues,
          "MISSING_REQUIRED_BOOTSTRAP_MODULE",
          "error",
          sliceId,
          `Bootstrap-modul ${sliceId} saknas i registry-kontraktet.`
        );
      }
    }
  }

  const fatalIssues = issues.filter((issue) => issue.severity === "error");
  if (strict && fatalIssues.length > 0) {
    const message = fatalIssues.map((issue) => `${issue.sliceId}: ${issue.message}`).join(" | ");
    throw new Error(`Bootstrap pipeline-registry validation misslyckades: ${message}`);
  }

  return { entries, issues };
}
