import { parseLine, validateProgramSyntax } from "@/lib/engine";

export function miniScriptDiagnostics(code: string) {
  try {
    validateProgramSyntax(code.split("\n").map(parseLine));
    return [];
  } catch (error) {
    const details = error as { line?: number; message?: string };
    const line = Math.max(1, details.line || 1);
    return [{ startLineNumber: line, endLineNumber: line, startColumn: 1,
      endColumn: Math.max(2, (code.split("\n")[line - 1]?.length || 0) + 1),
      message: details.message || "Invalid syntax" }];
  }
}

export const SYNTAX_GRAMMARS: Record<string, string> = {
  python: "python", c: "c", cpp: "cpp", java: "java", csharp: "c_sharp",
  go: "go", rust: "rust", html: "html", shell: "bash", yaml: "yaml",
};
