import { describe, expect, it } from "vitest";

import { createProjectFile } from "./editor-project";
import { isSupportedGitHubTextPath } from "./github-integration";
import { isPythonNotebook, notebookText, notebookStoredOutput, parseEditorNotebook } from "./editor-notebook";

describe("editor notebooks", () => {
  it("recognizes notebook paths for both projects and GitHub imports", () => {
    expect(createProjectFile("examples/demo.IPYNB").language).toBe("notebook");
    expect(isSupportedGitHubTextPath("examples/demo.ipynb")).toBe(true);
  });

  it("reads line arrays and keeps notebook metadata and stored output", () => {
    const document = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: { kernelspec: { name: "python3", language: "python" }, custom: { keep: true } },
      cells: [
        { cell_type: "markdown", source: "# Notes" },
        { cell_type: "code", source: ["x = 2\n", "print(x)"], outputs: [{ output_type: "stream", text: ["2\n"] }] },
      ],
    };
    const notebook = parseEditorNotebook(JSON.stringify(document));
    expect(notebook).toEqual(document);
    expect(notebookStoredOutput(notebook!.cells[1])).toBe("2\n");
    expect(notebookText(notebook!.cells[1].source)).toBe("x = 2\nprint(x)");
  });

  it("rejects invalid structures and recognizes a non-Python kernel", () => {
    expect(parseEditorNotebook("{")).toBeNull();
    expect(parseEditorNotebook('{"nbformat":4,"cells":[{"cell_type":"code","source":[1]}]}')).toBeNull();
    const notebook = parseEditorNotebook('{"nbformat":4,"cells":[],"metadata":{"kernelspec":{"name":"ir","language":"R"}}}');
    expect(isPythonNotebook(notebook!)).toBe(false);
  });
});
