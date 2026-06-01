export const CURRENT_MODULE_SCHEMA_VERSION = "1.0.0";

export const CURRENT_SCHEMA_MAJOR = 1;
export const CURRENT_SCHEMA_MINOR = 0;
export const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export type ModuleSchemaIssueCode =
  | "SCHEMA_VERSION_MISSING"
  | "SCHEMA_VERSION_INVALID"
  | "SCHEMA_VERSION_UNSUPPORTED_MAJOR"
  | "SCHEMA_VERSION_FUTURE";

export type ModuleSchemaIssueSeverity = "warning" | "error";

export interface ModuleSchemaIssue {
  code: ModuleSchemaIssueCode;
  severity: ModuleSchemaIssueSeverity;
  artifactType: "slice-manifest" | "main-host" | "preload-host" | "other-host";
  sliceId: string;
  observed?: string;
  expected?: string;
  message: string;
}

function asIssue(
  code: ModuleSchemaIssueCode,
  severity: ModuleSchemaIssueSeverity,
  artifactType: ModuleSchemaIssue["artifactType"],
  sliceId: string,
  message: string,
  observed?: string,
  expected?: string
): ModuleSchemaIssue {
  return {
    code,
    severity,
    artifactType,
    sliceId,
    observed,
    expected,
    message
  };
}

function parseSchemaVersion(value: string) {
  const match = value.match(VERSION_PATTERN);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    value
  };
}

export function validateModuleSchemaVersion(
  artifactType: ModuleSchemaIssue["artifactType"],
  sliceId: string,
  version: unknown,
  options: { required?: boolean } = {}
): ModuleSchemaIssue[] {
  const issues: ModuleSchemaIssue[] = [];
  const required = options.required ?? false;

  if (typeof version !== "string" || version.trim().length === 0) {
    if (required) {
      issues.push(
        asIssue(
          "SCHEMA_VERSION_MISSING",
          "error",
          artifactType,
          sliceId,
          `schemaVersion saknas på ${artifactType} för ${sliceId}.`,
          undefined,
          CURRENT_MODULE_SCHEMA_VERSION
        )
      );
    }
    return issues;
  }

  const parsed = parseSchemaVersion(version.trim());
  if (!parsed) {
    issues.push(
      asIssue(
        "SCHEMA_VERSION_INVALID",
        "error",
        artifactType,
        sliceId,
        `${artifactType} ${sliceId} har ogiltig schemaVersion "${version}". Använd semantik ${CURRENT_MODULE_SCHEMA_VERSION}.`,
        version,
        CURRENT_MODULE_SCHEMA_VERSION
      )
    );
    return issues;
  }

  if (parsed.major !== CURRENT_SCHEMA_MAJOR) {
    issues.push(
      asIssue(
        "SCHEMA_VERSION_UNSUPPORTED_MAJOR",
        "error",
        artifactType,
        sliceId,
        `${artifactType} ${sliceId} använder unsupported schema major ${parsed.major}; kräver ${CURRENT_SCHEMA_MAJOR}.`,
        version,
        CURRENT_MODULE_SCHEMA_VERSION
      )
    );
  }

  if (parsed.major === CURRENT_SCHEMA_MAJOR && parsed.minor > CURRENT_SCHEMA_MINOR) {
    issues.push(
      asIssue(
        "SCHEMA_VERSION_FUTURE",
        "warning",
        artifactType,
        sliceId,
        `${artifactType} ${sliceId} deklarerar framtida schema-minor ${parsed.minor}; förväntad max ${CURRENT_SCHEMA_MINOR}.`,
        version,
        CURRENT_MODULE_SCHEMA_VERSION
      )
    );
  }

  return issues;
}

export type VersionedContractArtifact = {
  schemaVersion?: string;
};
