import { describe, expect, it } from "vitest";

import {
  editorCodeTransferKey,
  getEditorTransferFileName,
  isEditorLanguageKey,
  parseEditorCodeTransfer,
} from "./editor-code-transfer";

describe("editor code transfers", () => {
  it("uses a language-appropriate filename when documentation has no title", () => {
    expect(getEditorTransferFileName("python")).toBe("main.py");
    expect(getEditorTransferFileName("cpp")).toBe("main.cpp");
    expect(getEditorTransferFileName("msp")).toBe("main.msp");
  });

  it("keeps only the basename supplied by documentation metadata", () => {
    expect(getEditorTransferFileName("typescript", "examples/hello.ts")).toBe("hello.ts");
  });

  it("parses a valid transfer and rejects unsupported languages", () => {
    const valid = parseEditorCodeTransfer(JSON.stringify({
      version: 1,
      code: "print('hello')",
      language: "python",
      fileName: "hello.py",
      title: "First program",
      createdAt: 42,
    }));

    expect(valid).toMatchObject({
      code: "print('hello')",
      language: "python",
      fileName: "hello.py",
    });
    expect(parseEditorCodeTransfer(JSON.stringify({
      version: 1,
      code: "hello",
      language: "unknown",
      createdAt: 42,
    }))).toBeNull();
  });

  it("recognizes editor languages and scopes storage keys", () => {
    expect(isEditorLanguageKey("rust")).toBe(true);
    expect(isEditorLanguageKey("ruby")).toBe(false);
    expect(editorCodeTransferKey("abc")).toBe("scripticx:editor-code-transfer:abc");
  });
});

