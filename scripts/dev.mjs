import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateFeatureRegistry } from "./generate-feature-registry.mjs";
import { buildMain, buildPreload, startRendererDevServer } from "./vite-pipeline.mjs";

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
generateFeatureRegistry(projectRoot);
await buildMain(projectRoot, "development");
await buildPreload(projectRoot, "development");
const { server, url } = await startRendererDevServer(projectRoot);

const child = spawn(
  electronExecPath,
  [path.join(projectRoot, "dist-electron", "main", "index.js")],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: url
    }
  }
);

child.on("exit", (code) => {
  server.close().catch(() => undefined);
  process.exit(code ?? 0);
});

