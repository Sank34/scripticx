import { describe, expect, it } from "vitest";

import {
  buildProjectTree,
  createProjectDirectory,
  createProjectFile,
  createProjectTemplate,
  getEditorLanguage,
  normalizeProjectEntries,
  normalizeProjectPath,
  serializeProjectEntries,
} from "./editor-project";

describe("editor project model", () => {
  it("detects Monaco languages from project paths", () => {
    expect(getEditorLanguage("src/main.msp")).toBe("msp");
    expect(getEditorLanguage("src/App.tsx")).toBe("typescriptreact");
    expect(getEditorLanguage("scripts/build.py")).toBe("python");
    expect(getEditorLanguage("types/api.pyi")).toBe("python");
    expect(getEditorLanguage("include/math.ipp")).toBe("cpp");
    expect(getEditorLanguage("README.md")).toBe("markdown");
  });

  it("normalizes legacy flat files", () => {
    const project = normalizeProjectEntries(
      [{ id: "one", name: "main.msp", content: "PRINT 1" }],
      ""
    );

    expect(project.files[0]).toMatchObject({
      id: "one",
      kind: "file",
      name: "main.msp",
      path: "main.msp",
      language: "msp",
    });
  });

  it("round-trips directories alongside files", () => {
    const entries = serializeProjectEntries(
      [createProjectFile("src/main.py", "print('ok')")],
      [createProjectDirectory("src"), createProjectDirectory("tests")]
    );
    const project = normalizeProjectEntries(entries, "");

    expect(project.files[0].path).toBe("src/main.py");
    expect(project.directories.map((directory) => directory.path)).toEqual(["src", "tests"]);
  });

  it("builds a sorted explorer tree", () => {
    const tree = buildProjectTree(
      [createProjectFile("src/main.msp"), createProjectFile("README.md")],
      [createProjectDirectory("tests")]
    );

    expect(tree.map((node) => node.name)).toEqual(["src", "tests", "README.md"]);
    expect(tree[0].children[0].path).toBe("src/main.msp");
  });

  it("normalizes separators without escaping the project root", () => {
    expect(normalizeProjectPath(" src\\utils//math.ts ")).toBe("src/utils/math.ts");
  });

  it("creates runtime-ready project structures without enabling a runtime", () => {
    const python = createProjectTemplate("python");
    const cpp = createProjectTemplate("cpp");

    expect(python.files.map((file) => file.path)).toContain("requirements.txt");
    expect(python.files.map((file) => file.path)).toContain("src/main.py");
    expect(cpp.files.map((file) => file.path)).toContain("CMakeLists.txt");
    expect(cpp.directories.map((directory) => directory.path)).toContain("include");
  });
});
