import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBootstrapPipelineRegistry } from "@app/registry/bootstrapPipelineRegistry";
import { registerMainSliceHosts } from "@app/registry/mainHosts";
import { sliceRegistry } from "@app/registry/slices";
import { buildMainHostContext } from "./mainHostContext";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_RUNTIME_TTL_MS = 24 * 60 * 60 * 1000;

configureDevRuntimePaths();

let mainWindow: BrowserWindow | null = null;
const iconPath = path.resolve(__dirname, "../../assets/branding/purrifer-logo.ico");

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, "../preload/index.mjs"),
    path.join(__dirname, "../preload/index.js")
  ];
  const entry = candidates.find((candidate) => existsSync(candidate));

  if (!entry) {
    throw new Error(`Kunde inte hitta preload entrypoint. Letade i: ${candidates.join(", ")}`);
  }
  console.log(`[startup] preload entrypoint: ${entry}`);
  return entry;
}

function configureDevRuntimePaths() {
  if (!process.env.ELECTRON_RENDERER_URL) {
    return;
  }

  const runtimeBase = path.join(app.getPath("temp"), "purrifer-dev-runtime");
  const runtimeRoot = path.join(
    runtimeBase,
    String(process.pid)
  );

  // Best-effort cleanup: remove stale dev runtime directories without blocking startup.
  void cleanupStaleDevRuntimeDirs(runtimeBase, runtimeRoot).catch((reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.warn(`[purrifer-dev-runtime] cleanup skipped: ${message}`);
  });

  app.setPath("userData", path.join(runtimeRoot, "user-data"));
  app.setPath("sessionData", path.join(runtimeRoot, "session-data"));
  app.commandLine.appendSwitch("disk-cache-dir", path.join(runtimeRoot, "cache"));
}

function assertBootstrapPipelineRegistration() {
  validateBootstrapPipelineRegistry({
    manifests: sliceRegistry,
    strict: process.env.NODE_ENV !== "test"
  });
}

async function cleanupStaleDevRuntimeDirs(runtimeBase: string, currentRuntimeRoot: string) {
  const entries = await readdir(runtimeBase, { withFileTypes: true });
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(runtimeBase, entry.name);
    if (path.resolve(entryPath) === path.resolve(currentRuntimeRoot)) {
      continue;
    }

    let entryStat;
    try {
      entryStat = await stat(entryPath);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.warn(`[purrifer-dev-runtime] unable to inspect ${entry.name}: ${message}`);
      continue;
    }

    if (now - entryStat.mtimeMs < DEV_RUNTIME_TTL_MS) {
      continue;
    }

    try {
      await rm(entryPath, { recursive: true, force: true });
      console.log(`[purrifer-dev-runtime] removed stale runtime dir: ${entry.name}`);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.warn(`[purrifer-dev-runtime] unable to remove ${entry.name}: ${message}`);
    }
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#efe7d8",
    title: "Purrifer",
    icon: iconPath,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
  } else {
    const rendererCandidates = [
      path.join(__dirname, "../renderer/index.html"),
      path.join(__dirname, "../../out/renderer/index.html"),
      path.join(__dirname, "../../../out/renderer/index.html")
    ];
    const rendererEntry = rendererCandidates.find((candidate) => existsSync(candidate));

    if (!rendererEntry) {
      throw new Error(
        `Kunde inte hitta renderer entrypoint. Letade i: ${rendererCandidates.join(", ")}`
      );
    }

    await mainWindow.loadFile(rendererEntry);
  }
}

function registerHandlers() {
  const context = buildMainHostContext({
    userDataPath: app.getPath("userData"),
    pythonBridgeScriptPath: path.resolve(__dirname, "../../scripts/python/document_engine.py")
  });

  const registration = registerMainSliceHosts(context, { strict: false });
  for (const issue of registration.issues) {
    const line = `[main-host][${issue.sliceId}] ${issue.channel ? `${issue.channel} ` : ""}${issue.message}`;
    if (issue.severity === "error") {
      console.error(line);
    } else {
      console.warn(line);
    }
  }
}

app
  .whenReady()
  .then(async () => {
    assertBootstrapPipelineRegistration();
    registerHandlers();
    await createMainWindow();

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });
  })
  .catch((reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`[startup] ${message}`);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


