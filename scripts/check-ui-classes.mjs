import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const scanRoots = [
  path.join(rootDir, "src", "renderer"),
  path.join(rootDir, "src", "features")
];

const allowedNonUiClasses = new Set([
  "selectable",
  "selected",
  "busy"
]);

const bannedLegacyClasses = new Set([
  "page",
  "page-header",
  "header-actions",
  "eyebrow",
  "muted",
  "primary-button",
  "secondary-button",
  "panel-card",
  "list-card",
  "panel-topline",
  "list-card-topline",
  "stacked-list",
  "split-layout",
  "field-grid",
  "detail-grid",
  "field-label",
  "detail-label",
  "status-pill",
  "empty-state",
  "text-input",
  "detail-span",
  "choice-row",
  "selected-chip",
  "path-preview",
  "text-preview",
  "file-trigger",
  "panel-grid",
  "hero-dropzone",
  "intake-zone",
  "document-preview-image",
  "document-preview-frame"
]);

const violations = [];

for (const root of scanRoots) {
  walk(root);
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.message}`);
  }
  process.exit(1);
}

function walk(currentPath) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!/\.(tsx|jsx)$/.test(entry.name)) {
      continue;
    }

    checkFile(fullPath);
  }
}

function checkFile(fullPath) {
  const source = fs.readFileSync(fullPath, "utf8");
  const relativePath = path.relative(rootDir, fullPath);
  const lines = source.split(/\r?\n/);

  const directPattern = /className\s*=\s*["']([^"']+)["']/g;
  const expressionPattern = /className\s*=\s*\{([\s\S]*?)\}/g;

  inspectMatches(relativePath, lines, source, directPattern, (match) => [match[1]]);
  inspectMatches(relativePath, lines, source, expressionPattern, (match) => {
    const classes = [];
    const stringPattern = /["']([^"']+)["']/g;
    for (const stringMatch of match[1].matchAll(stringPattern)) {
      classes.push(stringMatch[1]);
    }
    return classes;
  });
}

function inspectMatches(relativePath, lines, source, pattern, extractValues) {
  for (const match of source.matchAll(pattern)) {
    const values = extractValues(match);
    const line = 1 + source.slice(0, match.index).split(/\r?\n/).length - 1;

    for (const value of values) {
      for (const token of value.split(/\s+/).filter(Boolean)) {
        if (bannedLegacyClasses.has(token)) {
          violations.push({
            file: relativePath,
            line,
            message: `legacy class forbidden: ${token}`
          });
          continue;
        }

        if (token.startsWith("ui-")) {
          continue;
        }

        if (allowedNonUiClasses.has(token)) {
          continue;
        }

        violations.push({
          file: relativePath,
          line,
          message: `non-ui class forbidden: ${token}`
        });
      }
    }
  }
}
