import type { IpcResult } from "@app/shared/errors/AppError";
import { validateBootstrapPipelineRegistry } from "@app/registry/bootstrapPipelineRegistry";
import { exposePreloadSliceApis } from "@app/registry/preloadHosts";
import { sliceRegistry } from "@app/registry/slices";
import type { PreloadHostContext } from "@app/registry/preloadHostTypes";
import { ipcRenderer } from "electron";

async function invokeIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (result.ok) {
    return result.data;
  }
  throw new Error(`[${result.error.code}] ${result.error.message}`);
}

const context: PreloadHostContext = {
  invoke: invokeIpc
};

validateBootstrapPipelineRegistry({
  manifests: sliceRegistry,
  strict: process.env.NODE_ENV !== "test"
});

const registration = exposePreloadSliceApis(context, { strict: false });

for (const issue of registration.issues) {
  const line = `[preload-host][${issue.sliceId}] ${issue.method ? `${issue.method} ` : ""}${issue.channel ? `${issue.channel} ` : ""}${issue.message}`;
  if (issue.severity === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}


