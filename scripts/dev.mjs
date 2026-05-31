import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const electronExecPath = path.join(
  projectRoot,
  "node_modules",
  "electron",
  "dist",
  "electron.exe"
);
const cliPath = path.join(
  projectRoot,
  "node_modules",
  "electron-vite",
  "dist",
  "cli.mjs"
);

const child = spawn(
  process.execPath,
  [cliPath, "dev"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_EXEC_PATH: electronExecPath
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

