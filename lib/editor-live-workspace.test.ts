import { describe, expect, it } from "vitest";

import {
  createLiveWorkspaceDocument,
  getLiveWorkspaceFingerprint,
  getLiveWorkspaceUrl,
  parseLiveWorkspace,
  serializeLiveWorkspace,
} from "./editor-live-workspace";
import { createProjectDirectory, createProjectFile } from "./editor-project";

describe("editor live workspace", () => {
  it("round-trips the entire project instead of only main.msp", () => {
    const main = createProjectFile("src/main.py", "print('hello')");
    const readme = createProjectFile("README.md", "# Demo");
    const document = createLiveWorkspaceDocument({
      title: "Python demo",
      description: "Shared workspace",
      files: [main, readme],
      directories: [createProjectDirectory("src")],
      activeFileId: readme.id,
    });

    const parsed = parseLiveWorkspace(serializeLiveWorkspace(document));

    expect(parsed.title).toBe("Python demo");
    expect(parsed.files.map((file) => file.path)).toEqual([
      "src/main.py",
      "README.md",
    ]);
    expect(parsed.directories[0]?.path).toBe("src");
    expect(parsed.activeFileId).toBe(readme.id);
  });

  it("opens legacy single-file sessions as MiniScript+ projects", () => {
    const parsed = parseLiveWorkspace("PRINT 42");

    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0]).toMatchObject({
      path: "main.msp",
      content: "PRINT 42",
    });
  });

  it("creates editor deep links without a separate live route", () => {
    expect(getLiveWorkspaceUrl("room-1", "https://platform.scripticx.org/"))
      .toBe("https://platform.scripticx.org/editor?live=room-1&view=live");
  });

  it("keeps each collaborator's active tab local", () => {
    const first = createProjectFile("main.msp", "PRINT 1");
    const second = createProjectFile("README.md", "# Notes");
    const base = createLiveWorkspaceDocument({
      files: [first, second],
      directories: [],
      activeFileId: first.id,
    });

    expect(getLiveWorkspaceFingerprint(base)).toBe(
      getLiveWorkspaceFingerprint({ ...base, activeFileId: second.id })
    );
  });
});
