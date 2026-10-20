import { describe, expect, it } from "vitest";
import { hasExecutionFileConflict, isSafeExecutionFilePath } from "./execution-file-path";

describe("execution file paths", () => {
  it.each(["input.txt", "src/main.cpp", "date de test/input.in", "one/two/data.txt"])("accepts project path %j", path => {
    expect(isSafeExecutionFilePath(path)).toBe(true);
  });
  it.each(["", "/etc/passwd", "../input.txt", "data/../input.txt", "data/./input.txt", "data//input.txt", "data/", "C:/input.txt", "data\\input.txt", "bad\0.txt", "bad\n.txt", ".scripticx/program", "data/.SCRIPTICX/program", "input.txt/.."])("rejects unsafe or reserved path %j", path => {
    expect(isSafeExecutionFilePath(path)).toBe(false);
  });
  it("detects duplicate and file/directory conflicts while allowing different basenames", () => {
    const names = new Set(["data/input.txt", "values"]);
    for (const path of ["DATA/INPUT.txt", "data", "values/input.txt"]) expect(hasExecutionFileConflict(names, path)).toBe(true);
    expect(hasExecutionFileConflict(names, "samples/input.txt")).toBe(false);
  });
});
