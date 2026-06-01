import type { IpcMainInvokeEvent } from "electron";
import type { IpcResult } from "@app/shared/errors/AppError";
import { toAppError } from "@app/shared/errors/AppError";

export async function runIpcHandler<T>(
  work: (_event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T>,
  event: IpcMainInvokeEvent,
  ...args: unknown[]
): Promise<IpcResult<T>> {
  try {
    const data = await work(event, ...args);
    return { ok: true, data };
  } catch (reason: unknown) {
    const error = toAppError(reason);
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        type: error.type,
        details: error.details
      }
    };
  }
}


