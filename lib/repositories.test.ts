import { describe, expect, it } from "vitest";

import { buildProjectTree, createProjectDirectory, createProjectFile, normalizeProjectEntries } from "./editor-project";
import { findRepositoryReadme, repositoryHref, repositoryPathHref, resolveRepositoryPath } from "./repositories";

describe("repository files", () => {
  it("renders the root README regardless of filename casing", () => {
    const nested = createProjectFile("examples/README.md", "Example");
    const readme = createProjectFile("Readme.MD", "# Repository");

    expect(findRepositoryReadme([nested, readme])).toBe(readme);
    expect(findRepositoryReadme([nested])).toBeUndefined();
  });

  it("keeps code-only snippets readable without a README", () => {
    const { files } = normalizeProjectEntries([], "PRINT 42");

    expect(files[0]).toMatchObject({ path: "main.msp", content: "PRINT 42" });
    expect(findRepositoryReadme(files)).toBeUndefined();
  });

  it("browses nested paths and keeps empty folders visible", () => {
    const file = createProjectFile("src/my folder/main.msp", "PRINT 42");
    const tree = buildProjectTree([file], [createProjectDirectory("src/empty")]);

    expect(resolveRepositoryPath(tree, "src").entries.map((entry) => entry.name)).toEqual(["empty", "my folder"]);
    expect(resolveRepositoryPath(tree, "src/empty").entries).toEqual([]);
    expect(resolveRepositoryPath(tree, file.path).file).toBe(file);
    expect(resolveRepositoryPath(tree, "src/missing").entries).toBe(tree);
    expect(repositoryPathHref("project-id", file.path)).toBe("/repos/project-id?path=src%2Fmy%20folder%2Fmain.msp");
  });

  it("preserves file selection in repository links", () => {
    expect(repositoryHref("project-id", "file #1")).toBe("/repos/project-id?file=file%20%231");
  });
});
