import type { EditorLanguageKey } from "@/lib/editor-project";

const EDITOR_LANGUAGE_ALIASES: Record<string, EditorLanguageKey> = {
  bash: "shell",
  c: "c",
  "c#": "csharp",
  "c++": "cpp",
  cpp: "cpp",
  cs: "csharp",
  csharp: "csharp",
  css: "css",
  go: "go",
  html: "html",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascriptreact",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  miniscript: "msp",
  miniscriptplus: "msp",
  msp: "msp",
  plaintext: "text",
  py: "python",
  python: "python",
  rs: "rust",
  rust: "rust",
  sass: "scss",
  scss: "scss",
  sh: "shell",
  shell: "shell",
  sql: "sql",
  text: "text",
  ts: "typescript",
  tsx: "typescriptreact",
  typescript: "typescript",
  yaml: "yaml",
  yml: "yaml",
};

export function resolveCodeBlockLanguage(language: string | undefined) {
  const normalized = language?.trim().toLocaleLowerCase() || "plaintext";
  return EDITOR_LANGUAGE_ALIASES[normalized] ?? "text";
}

