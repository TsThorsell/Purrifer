import { contextBridge } from "electron";
import { validateModuleSchemaVersion } from "@app/registry/moduleSchema";
import type {
  PreloadHostContext,
  PreloadHostDiscoveryIssue,
  PreloadHostDiscoveryResult,
  PreloadIpcMethodSpec,
  PreloadIpcPermission,
  PreloadSliceHost
} from "./preloadHostTypes";
import { generatedPreloadHostModules } from "./generated/generatedPreloadHostModules";

type ImportedPreloadHostModule = {
  createPreloadSliceHost?: (context: PreloadHostContext) => PreloadSliceHost | null | undefined;
};

function getPreloadHostFactories(): ImportedPreloadHostModule[] {
  const hostModules = generatedPreloadHostModules;

  return Object.entries(hostModules)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([, module]) => module);
}

function normalizePermission(permission: string | undefined): PreloadIpcPermission {
  return permission === "restricted" ? "restricted" : "public";
}

function validateMethod(
  host: PreloadSliceHost,
  method: PreloadIpcMethodSpec,
  issuedMethods: Set<string>,
  issues: PreloadHostDiscoveryIssue[],
  strict: boolean
): boolean {
  if (typeof method.method !== "string" || method.method.trim().length === 0) {
    issues.push({
      code: "HOST_METHOD_NOT_ALLOWED",
      severity: "error",
      sliceId: host.sliceId,
      namespace: host.namespace,
      message: `Metod saknas eller är ogiltig i host ${host.sliceId}.`
    });
    return false;
  }

  if (!issuedMethods.has(method.method)) {
    issuedMethods.add(method.method);
  } else {
    issues.push({
      code: "DUPLICATE_METHOD",
      severity: strict ? "error" : "warning",
      sliceId: host.sliceId,
      namespace: host.namespace,
      method: method.method,
      message: `Metod ${method.method} i namespace ${host.namespace} är registrerad mer än en gång.`
    });
  }

  if (typeof method.channel !== "string" || method.channel.trim().length === 0) {
    issues.push({
      code: "METHOD_CHANNEL_MISSING",
      severity: "error",
      sliceId: host.sliceId,
      namespace: host.namespace,
      method: method.method,
      message: `Kanal saknas för metod ${method.method} i ${host.namespace}.`
    });
    return false;
  }

  method.permission = normalizePermission(method.permission);
  return true;
}

export function registerPreloadSliceHosts(
  context: PreloadHostContext,
  options: { strict?: boolean } = {}
): PreloadHostDiscoveryResult {
  const strict = options.strict !== false;
  const issues: PreloadHostDiscoveryIssue[] = [];
  const apis: Record<string, Record<string, unknown>> = {};
  const modules = getPreloadHostFactories();
  const factories = modules.filter((module): module is ImportedPreloadHostModule =>
    Boolean(module)
  );

  const seenNamespaces = new Set<string>();

  for (const module of factories) {
    if (typeof module.createPreloadSliceHost !== "function") {
      continue;
    }

    try {
      const host = module.createPreloadSliceHost(context);
      if (!host) {
        continue;
      }

      const schemaIssues = validateModuleSchemaVersion("preload-host", host.sliceId, host.schemaVersion);
      issues.push(...schemaIssues);
      if (schemaIssues.some((issue) => issue.severity === "error")) {
        continue;
      }

      if (typeof host.sliceId !== "string" || host.sliceId.trim().length === 0) {
        issues.push({
          code: "INVALID_HOST_ENTRY",
          severity: "error",
          sliceId: "unknown",
          message: "Host-slice saknar giltigt sliceId."
        });
        if (strict) {
          continue;
        }
      }

      if (typeof host.namespace !== "string" || host.namespace.trim().length === 0) {
        issues.push({
          code: "HOST_NAMESPACE_MISSING",
          severity: "error",
          sliceId: host.sliceId,
          message: `Host ${host.sliceId} saknar namespace.`
        });
        continue;
      }

      if (seenNamespaces.has(host.namespace)) {
        issues.push({
          code: "DUPLICATE_NAMESPACE",
          severity: "error",
          sliceId: host.sliceId,
          namespace: host.namespace,
          message: `Namespace ${host.namespace} är redan registrerad av annan modul-host.`
        });
        continue;
      }
      seenNamespaces.add(host.namespace);

      if (!Array.isArray(host.methods) || host.methods.length === 0) {
        issues.push({
          code: "INVALID_HOST_ENTRY",
          severity: "warning",
          sliceId: host.sliceId,
          namespace: host.namespace,
          message: `Host ${host.sliceId} (${host.namespace}) har inga registrerade metoder.`
        });
        continue;
      }

      const namespaceApi: Record<string, unknown> = {};
      const seenMethods = new Set<string>();

      for (const rawMethod of host.methods) {
        const method = {
          ...rawMethod,
          permission: normalizePermission(rawMethod?.permission)
        };
        if (!validateMethod(host, method, seenMethods, issues, strict)) {
          continue;
        }

        const methodName = method.method;
        namespaceApi[methodName] = (...args: unknown[]) => {
          if (method.validate) {
            method.validate(args);
          }
          return context.invoke(method.channel, ...args);
        };
      }

      apis[host.namespace] = namespaceApi;
    } catch (reason: unknown) {
      issues.push({
        code: "MODULE_LOAD_FAILURE",
        severity: "error",
        sliceId: "unknown",
        message: reason instanceof Error ? reason.message : "Okänd modul-fel vid preload-host-laddning."
      });
    }
  }

  const fatal = issues.filter((issue) => issue.severity === "error");
  if (strict && fatal.length > 0) {
    throw new Error(fatal.map((issue) => `${issue.sliceId}: ${issue.message}`).join(" | "));
  }

  return { apis, issues };
}

export function exposePreloadSliceApis(
  context: PreloadHostContext,
  options: { strict?: boolean } = {}
): PreloadHostDiscoveryResult {
  const discovery = registerPreloadSliceHosts(context, options);

  if (!contextBridge) {
    throw new Error("contextBridge is not available i preload-läget.");
  }

  contextBridge.exposeInMainWorld("purrifer", discovery.apis);
  return discovery;
}
