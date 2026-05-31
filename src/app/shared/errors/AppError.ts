export type AppErrorType = "business" | "technical";

export interface AppErrorPayload {
  code: string;
  message: string;
  type: AppErrorType;
  details?: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly type: AppErrorType;
  readonly details?: string;

  constructor(payload: AppErrorPayload) {
    super(payload.message);
    this.name = "AppError";
    this.code = payload.code;
    this.type = payload.type;
    this.details = payload.details;
  }
}

export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: AppErrorPayload;
}

export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

export function toAppError(reason: unknown): AppError {
  if (reason instanceof AppError) {
    return reason;
  }
  if (reason instanceof Error) {
    return new AppError({
      code: "TECHNICAL_UNEXPECTED",
      message: reason.message,
      type: "technical"
    });
  }
  return new AppError({
    code: "TECHNICAL_UNKNOWN",
    message: "Ett okant fel uppstod.",
    type: "technical"
  });
}

