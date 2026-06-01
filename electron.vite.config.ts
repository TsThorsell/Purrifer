import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      target: "node20.18",
      outDir: "dist-electron/main",
      rollupOptions: {
        external: ["better-sqlite3"]
      }
    },
    resolve: {
      alias: {
        "@app": resolve("src/app"),
        "@features": resolve("src/features")
      }
    }
  },
  preload: {
    build: {
      target: "node20.18",
      outDir: "dist-electron/preload",
      rollupOptions: {
        external: ["better-sqlite3"]
      }
    },
    resolve: {
      alias: {
        "@app": resolve("src/app"),
        "@features": resolve("src/features")
      }
    }
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
    resolve: {
      alias: {
        "@app": resolve("src/app"),
        "@features": resolve("src/features"),
        "@renderer": resolve("src/renderer")
      }
    }
  }
});
