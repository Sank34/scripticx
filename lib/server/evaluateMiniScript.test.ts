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

it("grades string processing with spaces, empty text, numeric text and Unicode", () => {
  const code = `INPUT x
key = "le papoi"
y = ""
FOR i FROM 0 TO LEN(x) - 1
  n = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
  IF i > 0 THEN
    y = y + " "
  END
  y = y + STR(n)
END
PRINT y`;
  expect(evaluateMiniScript(code, [
    { input: ["i love bananas"], output: "11341 3233 3457 12433 11447 11313 3553 10291 10477 11111 3105 12321 9410 12881" },
    { input: [""], output: "" },
    { input: [" "], output: "3457" },
    { input: ["😀"], output: "13879297" },
    { input: ["001"], output: "5185 4849 1569" },
    { input: ["a".repeat(50)], output: Array.from({ length: 50 }, (_, i) => String(97 * "le papoi".charCodeAt(i % 8) + 1)).join(" ") },
  ]).score).toBe(100);
});
