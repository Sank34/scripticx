import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { evaluateMiniScript } from "./evaluateMiniScript";

it("grades FOR loops and functions through the production problem evaluator", () => {
  const code = `FUNCTION sum(n)
  total = 0
  FOR i FROM 1 TO n
    total = total + i
  END
  RETURN total
END
INPUT n
PRINT sum(n)`;
  const result = evaluateMiniScript(code, [
    { input: [0], output: "0" }, { input: [1], output: "1" }, { input: [5], output: "15" },
  ]);
  expect(result.score).toBe(100);
  expect(result.results.every(test => test.passed)).toBe(true);
});

it("resumes INPUT inside a function without leaking values between test cases", () => {
  expect(evaluateMiniScript('FUNCTION read()\nINPUT x\nRETURN x\nEND\nPRINT read()', [
    { input: ["hello"], output: "hello" }, { input: [7], output: "7" },
  ]).score).toBe(100);
});

it("keeps runaway code bounded in the grader", () => {
  const result = evaluateMiniScript('FUNCTION recurse()\nRETURN recurse()\nEND\nrecurse()', [{ input: [], output: "1" }]);
  expect(result.score).toBe(0);
  expect(result.results[0].got).toContain("Maximum function call depth exceeded");
});
