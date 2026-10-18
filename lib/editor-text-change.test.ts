import { describe, expect, it } from "vitest";
import { getEditorTextChange } from "./editor-text-change";

describe("external editor text changes", () => {
  it("limits the replacement to the changed region", () => {
    expect(getEditorTextChange("hello world", "hello brave world")).toEqual({ start: 6, end: 6, text: "brave " });
    expect(getEditorTextChange("hello brave world", "hello world")).toEqual({ start: 6, end: 12, text: "" });
    expect(getEditorTextChange("same", "same")).toBeNull();
  });

  it.each([
    ["", "new"], ["old", ""], ["a\r\nb", "a\r\nc"], ["a😀z", "a😁z"],
    ["a😀z", "a😀😎z"], ["😀😀", "😀"], ["x\ny\nz", "x\nz"],
  ])("reconstructs %j → %j using UTF-16 offsets", (before, after) => {
    const change = getEditorTextChange(before, after)!;
    expect(before.slice(0, change.start) + change.text + before.slice(change.end)).toBe(after);
    expect(/[\uD800-\uDBFF]$/.test(before.slice(0, change.start))).toBe(false);
    expect(/^[\uDC00-\uDFFF]/.test(before.slice(change.end))).toBe(false);
  });
});
