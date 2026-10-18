import { describe, expect, it, vi, afterEach } from "vitest";
import { createProjectFile, createProjectDirectory } from "@/lib/editor-project";
import { editorSessionDraftKey, parseEditorSessionDraft, readEditorSessionDraft, writeEditorSessionDraft, type EditorSessionDraft } from "@/lib/editor-session-draft";

const file = createProjectFile("src/main.msp", "PRINT 42");
const second = createProjectFile("notes.md", "unsaved notes");
const draft: EditorSessionDraft = {
  files: [file, second], directories: [createProjectDirectory("empty")],
  title: "My draft", description: "Not saved to the server", savedId: "project-1",
  dirty: true, projectIsPublic: false, activeFileId: second.id,
  openFileIds: [second.id, file.id], projectSearch: "42", projectLibrarySearch: "draft", output: ["42"],
  activityView: "source-control", activePanel: "console",
};

afterEach(() => vi.unstubAllGlobals());

describe("editor session draft", () => {
  it("restores unsaved multi-file projects, empty folders, tab order and visibility", () => {
    expect(parseEditorSessionDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("repairs references to deleted files without losing code", () => {
    const restored = parseEditorSessionDraft(JSON.stringify({ ...draft, activeFileId: "deleted", openFileIds: ["deleted", file.id, file.id] }));
    expect(restored?.activeFileId).toBe(file.id);
    expect(restored?.openFileIds).toEqual([file.id]);
    expect(restored?.files).toEqual(draft.files);
  });

  it("ignores corrupt or incomplete storage rather than restoring an empty project", () => {
    for (const raw of [null, "{", "null", "[]", JSON.stringify({ ...draft, files: [] }), JSON.stringify({ ...draft, files: [{ id: "bad" }] })]) {
      expect(parseEditorSessionDraft(raw)).toBeNull();
    }
  });

  it("isolates accounts and survives unavailable browser storage while navigating", () => {
    vi.stubGlobal("window", { sessionStorage: {
      getItem: () => { throw new Error("storage blocked"); },
      setItem: () => { throw new Error("quota"); },
    } });
    writeEditorSessionDraft("alice", draft);
    expect(readEditorSessionDraft("alice")).toEqual(draft);
    expect(readEditorSessionDraft("bob")).toBeNull();
    expect(editorSessionDraftKey("alice")).not.toBe(editorSessionDraftKey("bob"));
  });
});
