import { describe, expect, it } from "vitest";

import {
  buildGitHubProjectEntries,
  getChangedGitHubPaths,
  isSafeGitHubPath,
  isSupportedGitHubTextPath,
  isValidGitBranchName,
  normalizeGitHubFiles,
} from "@/lib/github-integration";

describe("GitHub editor integration contracts", () => {
  it("accepts project source and configuration files", () => {
    expect(isSupportedGitHubTextPath("src/main.cpp")).toBe(true);
    expect(isSupportedGitHubTextPath("CMakeLists.txt")).toBe(true);
    expect(isSupportedGitHubTextPath(".gitignore")).toBe(true);
    expect(isSupportedGitHubTextPath("assets/logo.png")).toBe(false);
  });

  it("rejects paths that can escape or mutate Git internals", () => {
    expect(isSafeGitHubPath("src/main.ts")).toBe(true);
    expect(isSafeGitHubPath("../secret.txt")).toBe(false);
    expect(isSafeGitHubPath(".git/config")).toBe(false);
    expect(isSafeGitHubPath("/absolute.ts")).toBe(false);
  });

  it("validates regular and nested branches", () => {
    expect(isValidGitBranchName("main")).toBe(true);
    expect(isValidGitBranchName("feature/editor-sync")).toBe(true);
    expect(isValidGitBranchName("feature..broken")).toBe(false);
    expect(isValidGitBranchName("refs/heads/main.lock")).toBe(false);
  });

  it("reports changed and deleted project files", () => {
    expect(
      getChangedGitHubPaths(
        { "src/main.ts": "new", "README.md": "same" },
        { "src/main.ts": "old", "README.md": "same", "old.ts": "gone" }
      )
    ).toEqual({ changed: ["src/main.ts"], deleted: ["old.ts"] });
  });

  it("normalizes a unique, bounded file collection", () => {
    expect(normalizeGitHubFiles([{ path: "src/main.py", content: "print('ok')" }])).toEqual([
      { path: "src/main.py", content: "print('ok')" },
    ]);
    expect(() =>
      normalizeGitHubFiles([
        { path: "main.py", content: "one" },
        { path: "main.py", content: "two" },
      ])
    ).toThrow();
  });

  it("builds the complete directory tree for a cloned project", () => {
    expect(
      buildGitHubProjectEntries([
        { path: "src/features/main.ts", content: "export {};" },
        { path: "README.md", content: "# Project" },
      ])
    ).toEqual([
      { kind: "directory", name: "src", path: "src" },
      { kind: "directory", name: "features", path: "src/features" },
      {
        kind: "file",
        name: "main.ts",
        path: "src/features/main.ts",
        content: "export {};",
      },
      { kind: "file", name: "README.md", path: "README.md", content: "# Project" },
    ]);
  });
});
