import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const electronExecPath = path.join(projectRoot, "node_modules", "electron", "dist", "electron.exe");
const mainEntry = path.join(projectRoot, "dist-electron", "main", "index.js");

if (!existsSync(mainEntry)) {
  throw new Error(`Kunde inte hitta byggd main-entrypoint: ${mainEntry}`);
}

const child = spawn(electronExecPath, [mainEntry], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
