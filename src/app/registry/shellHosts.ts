import { validateModuleSchemaVersion } from "@app/registry/moduleSchema";
import type {
  ShellHostDiscoveryIssue,
  ShellHostDiscoveryResult,
  ShellSliceHost
} from "./shellHostTypes";
import { generatedShellHostModules } from "./generated/generatedShellHostModules";

type ImportedShellHostModule = {
  shellHost?: ShellSliceHost;
  createShellHost?: () => ShellSliceHost | null | undefined;
};

function getShellHostModules(): ImportedShellHostModule[] {
  const hostModules = generatedShellHostModules;

  return Object.entries(hostModules)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([, module]) => module);
}

function collectShellHosts(): ShellSliceHost[] {
  const hosts: ShellSliceHost[] = [];
  const modules = getShellHostModules();

  for (const module of modules) {
    if (module.createShellHost && typeof module.createShellHost === "function") {
      const host = module.createShellHost();
      if (host) {
        hosts.push(host);
      }
      continue;
    }

    if (module.shellHost) {
      hosts.push(module.shellHost);
    }
  }

  return hosts;
}

export function discoverShellHost(
  shellHosts: ShellSliceHost[] = collectShellHosts(),
  options: { strict?: boolean } = {}
): ShellHostDiscoveryResult {
  const strict = options.strict !== false;
  const issues: ShellHostDiscoveryIssue[] = [];
  const validHosts: ShellSliceHost[] = [];

  for (const host of shellHosts) {
    if (!host || typeof host !== "object") {
      issues.push({
        code: "INVALID_HOST_ENTRY",
        severity: "error",
        sliceId: "unknown",
        message: "Invalid shell-host-entry."
      });
      if (strict) {
        continue;
      }
    }

    if (typeof host?.sliceId !== "string" || host.sliceId.trim().length === 0) {
      issues.push({
        code: "INVALID_HOST_ENTRY",
        severity: "error",
        sliceId: "unknown",
        message: "Shell-host saknar sliceId."
      });
      if (strict) {
        continue;
      }
    }

    if (typeof host?.renderShell !== "function") {
      issues.push({
        code: "INVALID_HOST_ENTRY",
        severity: "error",
        sliceId: host?.sliceId ?? "unknown",
        message: `Shell-host ${host?.sliceId ?? "unknown"} saknar renderShell-funktion.`
      });
      continue;
    }

    const schemaIssues = validateModuleSchemaVersion("other-host", host.sliceId, host.schemaVersion, {
      required: strict
    });
    issues.push(...schemaIssues);
    if (schemaIssues.some((issue) => issue.severity === "error")) {
      continue;
    }

    validHosts.push(host);
  }

  if (validHosts.length === 0) {
    issues.push({
      code: "SHELL_HOST_MISSING",
      severity: "warning",
      sliceId: "shell-host",
      message: "Ingen giltig shell-host hittades; fallback-layout används."
    });
    return { host: undefined, issues };
  }

  if (validHosts.length > 1) {
    const primaryHost = validHosts[0];
    for (let index = 1; index < validHosts.length; index += 1) {
      const duplicateHost = validHosts[index];
      issues.push({
        code: "DUPLICATE_HOST",
        severity: "error",
        sliceId: duplicateHost.sliceId,
        message: `Shell-host ${duplicateHost.sliceId} dubbelregistrerad; endast ${primaryHost.sliceId} används.`
      });
    }
    return {
      host: validHosts[0],
      issues
    };
  }

  return {
    host: validHosts[0],
    issues
  };
}

const { host: shellHost, issues: shellHostDiscoveryIssues } = discoverShellHost(undefined, {
  strict: false
});

if (shellHostDiscoveryIssues.some((issue) => issue.severity === "error" || issue.severity === "warning")) {
  for (const issue of shellHostDiscoveryIssues) {
    if (issue.severity === "error") {
      console.error(`[shell-host] ${issue.sliceId}: ${issue.message}`);
      continue;
    }
    console.warn(`[shell-host] ${issue.sliceId}: ${issue.message}`);
  }
}

export { shellHost, shellHostDiscoveryIssues };

export function resolveShellHost(): ShellSliceHost | undefined {
  return shellHost;
}
