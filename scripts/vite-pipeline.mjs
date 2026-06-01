import react from "@vitejs/plugin-react";
import { build, createServer } from "vite";
import { builtinModules } from "node:module";
import path from "node:path";

const electronNodeTarget = "node20.18";

function createAliases(projectRoot) {
  return {
    "@app": path.join(projectRoot, "src", "app"),
    "@features": path.join(projectRoot, "src", "features"),
    "@renderer": path.join(projectRoot, "src", "renderer")
  };
}

function createNodeExternals() {
  return [
    "electron",
    "better-sqlite3",
    ...builtinModules,
    ...builtinModules.map((moduleName) => `node:${moduleName}`)
  ];
}

function createNodeBuildConfig(projectRoot, mode, entryPath, outDir, fileName) {
  return {
    configFile: false,
    mode,
    publicDir: false,
    resolve: {
      alias: createAliases(projectRoot),
      conditions: ["node"],
      mainFields: ["module", "jsnext:main", "jsnext"]
    },
    build: {
      target: electronNodeTarget,
      outDir,
      emptyOutDir: true,
      minify: false,
      reportCompressedSize: false,
      ssr: true,
      ssrEmitAssets: true,
      lib: {
        entry: path.join(projectRoot, entryPath),
        formats: ["es"],
        fileName: () => fileName
      },
      rollupOptions: {
        external: createNodeExternals(),
        output: {
          entryFileNames: fileName
        }
      }
    },
    ssr: {
      noExternal: true
    }
  };
}

export async function buildMain(projectRoot, mode = "production") {
  await build(
    createNodeBuildConfig(
      projectRoot,
      mode,
      path.join("src", "main", "index.ts"),
      path.join(projectRoot, "dist-electron", "main"),
      "index.js"
    )
  );
}

export async function buildPreload(projectRoot, mode = "production") {
  await build(
    createNodeBuildConfig(
      projectRoot,
      mode,
      path.join("src", "preload", "index.ts"),
      path.join(projectRoot, "dist-electron", "preload"),
      "index.mjs"
    )
  );
}

export async function buildRenderer(projectRoot, mode = "production") {
  await build({
    configFile: false,
    mode,
    root: path.join(projectRoot, "src", "renderer"),
    publicDir: false,
    plugins: [react()],
    resolve: {
      alias: createAliases(projectRoot)
    },
    build: {
      target: "chrome130",
      outDir: path.join(projectRoot, "out", "renderer"),
      emptyOutDir: true,
      minify: false,
      reportCompressedSize: false,
      rollupOptions: {
        input: path.join(projectRoot, "src", "renderer", "index.html")
      }
    }
  });
}

export async function startRendererDevServer(projectRoot) {
  const server = await createServer({
    configFile: false,
    root: path.join(projectRoot, "src", "renderer"),
    publicDir: false,
    plugins: [react()],
    resolve: {
      alias: createAliases(projectRoot)
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true
    }
  });

  await server.listen();
  const localUrls = server.resolvedUrls?.local ?? [];
  return {
    server,
    url: localUrls[0] ?? "http://127.0.0.1:5173/"
  };
}
