import { describe, expect, it } from "vitest";

import {
  buildCodeRunnerFiles,
  resolveTerminalExecution,
  tokenizeTerminalCommand,
} from "@/lib/code-runner";
import { createProjectFile } from "@/lib/editor-project";

describe("code runner contracts", () => {
  it("tokenizes quoted terminal arguments without invoking a shell", () => {
    expect(tokenizeTerminalCommand('run src/main.py -- "hello world" 2')).toEqual({
      error: null,
      tokens: ["run", "src/main.py", "--", "hello world", "2"],
    });
  });

  it("resolves a language command to a compatible project file", () => {
    const python = createProjectFile("src/main.py", "print('ok')");
    const cpp = createProjectFile("src/main.cpp", "int main() {} ");
    const result = resolveTerminalExecution("python src/main.py value", cpp, [cpp, python]);

    expect(result.error).toBeNull();
    expect(result.execution?.file.path).toBe("src/main.py");
    expect(result.execution?.args).toEqual(["value"]);
  });

  it("keeps the active file first and removes duplicate basenames", () => {
    const active = createProjectFile("src/main.py", "print('main')");
    const duplicate = createProjectFile("tests/main.py", "print('test')");
    const helper = createProjectFile("src/helper.py", "VALUE = 1");

    expect(buildCodeRunnerFiles(active, [duplicate, helper, active])).toEqual([
      { name: "main.py", content: "print('main')" },
      { name: "helper.py", content: "VALUE = 1" },
    ]);
  });

  it("includes Python requirements even when the project exceeds the execution file limit", () => {
    const active = createProjectFile("main.py", "import requests");
    const requirements = createProjectFile("requirements.txt", "requests\n");
    const files = [active, ...Array.from({ length: 35 }, (_, index) => createProjectFile(`file-${index}.py`, "")), requirements];
    const executionFiles = buildCodeRunnerFiles(active, files);
    expect(executionFiles).toHaveLength(32);
    expect(executionFiles[0].name).toBe("main.py");
    expect(executionFiles[1]).toEqual({ name: "requirements.txt", content: "requests\n" });
  });
});
