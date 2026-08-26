import { describe, expect, it } from "vitest";

import { noteCodeLowlight } from "@/lib/note-code-highlight";

function highlightClasses(language: string, source: string) {
  return JSON.stringify(noteCodeLowlight.highlight(language, source));
}

describe("note code highlighting", () => {
  it("highlights common programming languages", () => {
    const python = highlightClasses("python", 'print("Hello")');

    expect(python).toContain("hljs-built_in");
    expect(python).toContain("hljs-string");
  });

  it("highlights MiniScript+ keywords and literals", () => {
    const miniScript = highlightClasses(
      "miniscript",
      'IF ready THEN PRINT "Go" ELSE PRINT FALSE'
    );

    expect(miniScript).toContain("hljs-keyword");
    expect(miniScript).toContain("hljs-literal");
    expect(miniScript).toContain("hljs-string");
  });
});
