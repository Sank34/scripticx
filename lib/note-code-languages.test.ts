import { describe, expect, it } from "vitest";

import {
  findNoteCodeLanguage,
  getNoteCodeLanguageLabel,
  noteCodeLanguages,
} from "@/lib/note-code-languages";

describe("note code languages", () => {
  it("maps common Markdown aliases to their display language", () => {
    expect(findNoteCodeLanguage("js")?.id).toBe("javascript");
    expect(findNoteCodeLanguage("c++")?.id).toBe("cpp");
    expect(getNoteCodeLanguageLabel("py")).toBe("Python");
  });

  it("keeps imported custom language labels visible", () => {
    expect(findNoteCodeLanguage("custom-dsl")).toBeNull();
    expect(getNoteCodeLanguageLabel("custom-dsl")).toBe("custom-dsl");
  });

  it("offers plain text as a safe default", () => {
    expect(noteCodeLanguages[0].id).toBe("plaintext");
    expect(getNoteCodeLanguageLabel(null)).toBe("Plain text");
  });
});
