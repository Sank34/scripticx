import { cp, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const source = path.join(
  projectRoot,
  "node_modules",
  "monaco-editor",
  "min",
  "vs"
);
const target = path.join(projectRoot, "public", "monaco", "vs");

try {
  await stat(source);
} catch {
  throw new Error(
    "Monaco assets are missing. Run npm install before starting or building the app."
  );
}

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });

console.log("Prepared same-origin Monaco assets.");
