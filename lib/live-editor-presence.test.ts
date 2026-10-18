import { describe, expect, it } from "vitest";
import { getLiveEditorPeers, liveCursorColorIndex, parseLiveEditorSelection } from "./live-editor-presence";

const selection = { fileId: "python-file", startLineNumber: 1, startColumn: 2, endLineNumber: 3, endColumn: 4, positionLineNumber: 3, positionColumn: 4 };

describe("live editor presence", () => {
  it("retains remote selections and excludes this user's other tabs", () => {
    expect(getLiveEditorPeers({ own: [{ username: "Me", selection }], guest: [{ username: "Old" }, { username: "Guest", selection }] }, "own"))
      .toEqual([{ userId: "guest", username: "Guest", selection }]);
  });

  it("discards malformed positions and keeps valid positions for Monaco to clamp", () => {
    for (const value of [null, {}, { ...selection, fileId: "" }, { ...selection, endColumn: -1 }, { ...selection, positionLineNumber: 1.5 }, { ...selection, startColumn: Infinity }]) {
      expect(parseLiveEditorSelection(value)).toBeNull();
    }
    expect(parseLiveEditorSelection({ ...selection, positionLineNumber: 1000 })).toEqual({ ...selection, positionLineNumber: 1000 });
  });

  it("clears selections when a participant leaves the editor and limits presence labels", () => {
    expect(getLiveEditorPeers({ guest: [{ username: "x".repeat(100), selection: null }] }, "own"))
      .toEqual([{ userId: "guest", username: "x".repeat(48), selection: null }]);
    expect(getLiveEditorPeers({}, "own")).toEqual([]);
  });

  it("assigns stable colors in the collaborator palette", () => {
    for (const id of ["owner", "guest", "long-user-id-1234567890"]) {
      expect(liveCursorColorIndex(id)).toBe(liveCursorColorIndex(id));
      expect(liveCursorColorIndex(id)).toBeGreaterThanOrEqual(0);
      expect(liveCursorColorIndex(id)).toBeLessThan(6);
    }
  });
});
