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

  it("preserves empty source files, languages, directories and the saved GitHub project", () => {
    const files = ["main.py", "src/index.ts", "main.cpp", "requirements.txt"].map(path => createProjectFile(path, ""));
    const project = { projectId: "saved-project", ownerId: "owner", github: { owner: "sanke", repo: "demo", branch: "feature/python" } };
    const document = createLiveWorkspaceDocument({ files, directories: [createProjectDirectory("empty")], project });
    const parsed = parseLiveWorkspace(serializeLiveWorkspace(document));
    expect(parsed.files).toEqual(files);
    expect(parsed.files.map(file => file.language)).toEqual(files.map(file => file.language));
    expect(parsed.directories).toEqual(document.directories);
    expect(parsed.project).toEqual(project);
    expect(parsed.files.some(file => file.path === "main.msp")).toBe(false);
  });

  it("rejects damaged workspace data instead of turning it into MiniScript source", () => {
    expect(() => parseLiveWorkspace("SCRIPTICX_WORKSPACE_V1:{broken")).toThrow("workspace data is invalid");
    expect(() => parseLiveWorkspace('SCRIPTICX_WORKSPACE_V1:{"version":1,"entries":[]}')).toThrow();
  });

  it("shares repository display metadata without copying extra credentials", () => {
    const serialized = 'SCRIPTICX_WORKSPACE_V1:' + JSON.stringify({ version: 1,
      entries: [{ kind: "file", path: "main.py", content: "" }],
      project: { projectId: "project", ownerId: "owner", token: "private-token", github: { owner: "owner", repo: "repo", branch: "main", token: "private-token" } },
    });
    const parsed = parseLiveWorkspace(serialized);
    expect(parsed.project).toEqual({ projectId: "project", ownerId: "owner", github: { owner: "owner", repo: "repo", branch: "main" } });
    expect(serializeLiveWorkspace(parsed)).not.toContain("private-token");
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
