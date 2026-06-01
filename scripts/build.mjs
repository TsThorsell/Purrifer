import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateFeatureRegistry } from "./generate-feature-registry.mjs";
import { buildMain, buildPreload, buildRenderer } from "./vite-pipeline.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

generateFeatureRegistry(projectRoot);
await buildMain(projectRoot, "production");
await buildPreload(projectRoot, "production");
await buildRenderer(projectRoot, "production");
