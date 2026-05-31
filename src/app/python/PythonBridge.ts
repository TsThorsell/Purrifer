import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { AppError } from "@app/shared/errors/AppError";

interface PythonRequest {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
}

interface PythonResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class PythonBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, Pending>();
  private buffer = "";
  private counter = 0;

  constructor(private readonly pythonScriptPath: string) {}

  async request<T>(type: string, payload: Record<string, unknown>, timeoutMs = 7000): Promise<T> {
    this.ensureStarted();
    const id = `py-${++this.counter}`;
    const request: PythonRequest = { id, type, payload, timeoutMs };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new AppError({
            code: "PYTHON_TIMEOUT",
            message: `Python-anrop timeout for ${type}.`,
            type: "technical"
          })
        );
      }, timeoutMs);

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      this.child?.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  private ensureStarted(): void {
    if (this.child && !this.child.killed) {
      return;
    }

    this.child = spawn("python", [this.pythonScriptPath], { stdio: "pipe" });
    this.child.stdout.on("data", (chunk: Buffer) => this.onStdout(chunk.toString("utf8")));
    this.child.stderr.on("data", () => {
      // stderr can contain library diagnostics; request-level errors are returned on stdout protocol.
    });
    this.child.on("exit", () => {
      for (const [, entry] of this.pending.entries()) {
        clearTimeout(entry.timer);
        entry.reject(
          new AppError({
            code: "PYTHON_EXITED",
            message: "Python-motorn avslutades ovantat.",
            type: "technical"
          })
        );
      }
      this.pending.clear();
      this.child = null;
    });
  }

  private onStdout(text: string): void {
    this.buffer += text;

    while (true) {
      const lineBreak = this.buffer.indexOf("\n");
      if (lineBreak < 0) {
        break;
      }

      const line = this.buffer.slice(0, lineBreak).trim();
      this.buffer = this.buffer.slice(lineBreak + 1);
      if (!line) {
        continue;
      }

      let response: PythonResponse;
      try {
        response = JSON.parse(line) as PythonResponse;
      } catch {
        continue;
      }

      const pending = this.pending.get(response.id);
      if (!pending) {
        continue;
      }

      clearTimeout(pending.timer);
      this.pending.delete(response.id);
      if (response.ok) {
        pending.resolve(response.data);
      } else {
        pending.reject(
          new AppError({
            code: response.error?.code ?? "PYTHON_ERROR",
            message: response.error?.message ?? "Python-motorn returnerade fel.",
            type: "technical"
          })
        );
      }
    }
  }
}

