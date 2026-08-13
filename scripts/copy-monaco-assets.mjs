import { cp, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const monacoSource = path.join(
  projectRoot,
  "node_modules",
  "monaco-editor",
  "min",
  "vs"
);
const monacoTarget = path.join(projectRoot, "public", "monaco", "vs");
const excalidrawFontsSource = path.join(
  projectRoot,
  "node_modules",
  "@excalidraw",
  "excalidraw",
  "dist",
  "prod",
  "fonts"
);
const excalidrawFontsTarget = path.join(
  projectRoot,
  "public",
  "excalidraw",
  "fonts"
);

try {
  await stat(monacoSource);
} catch {
  throw new Error(
    "Monaco assets are missing. Run npm install before starting or building the app."
  );
}

try {
  await stat(excalidrawFontsSource);
} catch {
  throw new Error(
    "Excalidraw font assets are missing. Run npm install before starting or building the app."
  );
}

await mkdir(monacoTarget, { recursive: true });
await cp(monacoSource, monacoTarget, { recursive: true, force: true });
await mkdir(excalidrawFontsTarget, { recursive: true });
await cp(excalidrawFontsSource, excalidrawFontsTarget, {
  recursive: true,
  force: true,
});

console.log("Prepared same-origin Monaco and Excalidraw assets.");
