import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { runIpcHandler } from "@app/shared/ipc/ipcHandler";
import { validateModuleSchemaVersion } from "@app/registry/moduleSchema";
import type {
  MainHostContext,
  MainHostDiscoveryIssue,
  MainHostDiscoveryResult,
  MainHostFactory,
  MainIpcHandlerSpec,
  MainSliceHost
} from "./mainHostTypes";
import { generatedMainHostModules } from "./generated/generatedMainHostModules";

type ImportedMainHostModule = {
  createMainSliceHost?: MainHostFactory;
};

function getMainHostFactories(): ImportedMainHostModule[] {
  const hostModules = generatedMainHostModules;

  return Object.entries(hostModules)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([, module]) => module);
}

function normalizePermission(permission: string | undefined): MainIpcHandlerSpec["permission"] {
  return permission === "restricted" ? "restricted" : "public";
}

function getHandlerPermission(handler: MainIpcHandlerSpec["permission"], fallback = "public"): MainIpcHandlerSpec["permission"] {
  return handler ? normalizePermission(handler) : fallback;
}

function validateChannelFormat(host: MainSliceHost, entry: MainIpcHandlerSpec): MainHostDiscoveryIssue | null {
  if (!host.allowedChannels.includes(entry.channel)) {
    return {
      code: "HANDLER_CHANNEL_NOT_ALLOWED",
      severity: "error",
      sliceId: host.sliceId,
      channel: entry.channel,
      message: `Kanal ${entry.channel} saknas i hostens tillåtna channels-lista för ${host.sliceId}.`
    };
  }
  return null;
}

function validateHandlerEntry(
  host: MainSliceHost,
  entry: MainIpcHandlerSpec
): MainHostDiscoveryIssue | null {
  if (typeof entry.channel !== "string" || entry.channel.trim().length === 0) {
    return {
      code: "INVALID_HOST_ENTRY",
      severity: "error",
      sliceId: host.sliceId,
      message: `Host för ${host.sliceId} saknar giltig kanal-sträng.`
    };
  }
  if (typeof entry.handler !== "function") {
    return {
      code: "HANDLER_HANDLER_MISSING",
      severity: "error",
      sliceId: host.sliceId,
      channel: entry.channel,
      message: `Handler saknas för channel ${entry.channel} i ${host.sliceId}.`
    };
  }

  return validateChannelFormat(host, entry);
}

function createHandlerRunner(
  entry: MainIpcHandlerSpec
): (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown> {
  return async (event, ...args) => {
    return runIpcHandler(async (innerEvent, ...innerArgs) => {
      if (entry.requiresWindow) {
        const window = BrowserWindow.fromWebContents(innerEvent.sender);
        if (!window) {
          throw new Error("IPC-anrop saknade aktiv fönsterkontext.");
        }
      }

      if (entry.validate) {
        entry.validate(innerArgs);
      }

      return entry.handler(innerEvent, ...innerArgs);
    }, event, ...args);
  };
}

function installSliceHost(
  host: MainSliceHost,
  seenChannels: Set<string>,
  issues: MainHostDiscoveryIssue[]
): number {
  let registered = 0;

  for (const rawEntry of host.handlers) {
    const entry: MainIpcHandlerSpec = {
      ...rawEntry,
      permission: getHandlerPermission(rawEntry.permission)
    };

    const issue = validateHandlerEntry(host, entry);
    if (issue) {
      issues.push(issue);
      continue;
    }

    if (seenChannels.has(entry.channel)) {
      issues.push({
        code: "DUPLICATE_CHANNEL",
        severity: "error",
        sliceId: host.sliceId,
        channel: entry.channel,
        message: `Kanal ${entry.channel} är redan registrerad av annat modulhost.`
      });
      continue;
    }

    seenChannels.add(entry.channel);
    ipcMain.handle(entry.channel, createHandlerRunner(entry));
    registered += 1;
  }

  return registered;
}

export function discoverMainSliceHosts(
  context: MainHostContext,
  options: { strict?: boolean } = {}
): MainHostDiscoveryResult {
  const issues: MainHostDiscoveryIssue[] = [];
  const hosts: MainSliceHost[] = [];
  const modules = getMainHostFactories();
  const factories = modules.filter((module): module is ImportedMainHostModule => {
    return Boolean(module);
  });

  for (const module of factories) {
    try {
      if (typeof module.createMainSliceHost !== "function") {
        continue;
      }

      const result = module.createMainSliceHost(context);
      if (!result) {
        continue;
      }

      const host = Array.isArray(result) ? result[0] : result;
      const hostToPush = host?.sliceId ? host : null;
      if (!hostToPush) {
        continue;
      }

      const schemaIssues = validateModuleSchemaVersion("main-host", hostToPush.sliceId, hostToPush.schemaVersion);
      issues.push(...schemaIssues);
      if (schemaIssues.some((issue) => issue.severity === "error")) {
        continue;
      }

      if (!Array.isArray(host.handlers)) {
        issues.push({
          code: "INVALID_HOST_ENTRY",
          severity: "error",
          sliceId: host.sliceId,
          message: "Host saknar handlers."
        });
        continue;
      }

      if (!Array.isArray(host.allowedChannels)) {
        issues.push({
          code: "INVALID_HOST_ENTRY",
          severity: "error",
          sliceId: host.sliceId,
          message: "Host saknar allowedChannels."
        });
        continue;
      }

      hosts.push(hostToPush);
    } catch (error: unknown) {
      issues.push({
        code: "HOST_FACTORY_FAILURE",
        severity: "error",
        sliceId: "unknown",
        message: error instanceof Error ? error.message : "Okänt fel i modulens host-fabrik."
      });
    }
  }

  const fatalIssues = issues.filter((issue) => issue.severity === "error");
  if (options.strict !== false && fatalIssues.length > 0) {
    const message = fatalIssues.map((issue) => `${issue.sliceId}: ${issue.message}`).join(" | ");
    throw new Error(`Main host-fel vid init: ${message}`);
  }

  return { hosts, issues };
}

export function registerMainSliceHosts(
  context: MainHostContext,
  options: { strict?: boolean } = {}
): MainHostDiscoveryResult {
  const result = discoverMainSliceHosts(context, options);
  const seenChannels = new Set<string>();
  const runtimeIssues = [...result.issues];

  for (const host of result.hosts) {
    try {
      const registeredCount = installSliceHost(host, seenChannels, runtimeIssues);
      if (registeredCount === 0 && host.handlers.length > 0) {
        runtimeIssues.push({
          code: "HANDLER_CHANNEL_NOT_ALLOWED",
          severity: "warning",
          sliceId: host.sliceId,
          message: "Inga handlers registrerades för host."
        });
      }
    } catch (reason: unknown) {
      runtimeIssues.push({
        code: "HOST_FACTORY_FAILURE",
        severity: "error",
        sliceId: host.sliceId,
        message: reason instanceof Error ? reason.message : "Otillåten start i modulhost."
      });
    }
  }

  const fatalIssues = runtimeIssues.filter((issue) => issue.severity === "error");
  if (options.strict !== false && fatalIssues.length > 0) {
    const message = fatalIssues.map((issue) => `${issue.sliceId}: ${issue.message}`).join(" | ");
    throw new Error(`Main host start-validering misslyckades: ${message}`);
  }

  return { hosts: result.hosts, issues: runtimeIssues };
}
