import { expect, it } from "vitest";
import { miniScriptDiagnostics } from "./editor-diagnostics";
import { parseLine, reset, step } from "./engine";

it("marks misspelled instructions at their actual source line", () => {
  expect(miniScriptDiagnostics("# comment\nIMPUT X")).toMatchObject([{ startLineNumber: 2, message: 'Unknown instruction "IMPUT X"' }]);
});
it("reports missing blocks and incomplete expressions", () => {
  expect(miniScriptDiagnostics("WHILE X < 3")).toHaveLength(1);
  expect(miniScriptDiagnostics("X = 1 +")).toHaveLength(1);
});
it("validates without executing or changing the paused program", () => {
  reset();
  const program = ["X = 1", "X = X + 1", "PRINT X"].map(parseLine);
  expect(step(program)?.currentLine).toBe(1);
  expect(miniScriptDiagnostics("INPUT Y\nPRINT Y")).toEqual([]);
  expect(step(program)).toMatchObject({ executedLine: 2, currentLine: 2, variables: { X: 2 } });
  reset();
});
