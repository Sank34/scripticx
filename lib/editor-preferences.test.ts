import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  normalizeEditorPreferences,
} from "./editor-preferences";

describe("normalizeEditorPreferences", () => {
  it("returns product defaults for missing preferences", () => {
    expect(normalizeEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("keeps supported preferences and clamps font size", () => {
    expect(
      normalizeEditorPreferences({
        autoCompletion: false,
        fontSize: 99,
        tabSize: 4,
        wordWrap: true,
      })
    ).toMatchObject({
      autoCompletion: false,
      fontSize: 22,
      tabSize: 4,
      wordWrap: true,
    });
  });

  it("rejects unsupported tab sizes", () => {
    expect(normalizeEditorPreferences({ tabSize: 3 }).tabSize).toBe(2);
  });
});
