import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseLine, reset, setVariable, step } from "@/lib/engine";

function compile(code: string) {
  return code
    .trim()
    .split("\n")
    .map((line) => parseLine(line));
}

describe("MiniScript engine", () => {
  beforeEach(() => {
    reset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs assignments and print statements step by step", () => {
    const program = compile(`
X = 2
Y = X + 3
PRINT Y
`);

    expect(step(program)).toMatchObject({
      output: null,
      variables: { X: 2 },
      currentLine: 1,
    });
    expect(step(program)).toMatchObject({
      output: null,
      variables: { X: 2, Y: 5 },
      currentLine: 2,
    });
    expect(step(program)).toMatchObject({
      output: 5,
      variables: { X: 2, Y: 5 },
      currentLine: 3,
    });
    expect(step(program)).toBeNull();
  });

  it("requests input without advancing the current line", () => {
    const program = compile(`
INPUT N
PRINT N
`);

    expect(step(program)).toMatchObject({
      inputRequest: "N",
      currentLine: 0,
    });

    setVariable("N", 7);
    expect(step(program)).toMatchObject({
      inputRequest: "N",
      currentLine: 0,
      variables: { N: 7 },
    });
  });

  it("executes while loops", () => {
    const program = compile(`
X = 0
WHILE X < 2
  X = X + 1
END
PRINT X
`);

    let result = step(program);
    while (result) {
      result = step(program);
    }

    reset();
    const replay = compile(`
X = 0
WHILE X < 2
  X = X + 1
END
PRINT X
`);
    let lastOutput = null;
    let current = step(replay);
    while (current) {
      if (current.output !== null) lastOutput = current.output;
      current = step(replay);
    }

    expect(lastOutput).toBe(2);
  });

  it("throws on division by zero", () => {
    const program = compile(`
A = 0
B = 0
C = A / B
`);

    step(program);
    step(program);
    expect(() => step(program)).toThrow("Division by zero is not allowed");
  });

  it("throws on modulo by zero", () => {
    const program = compile(`
A = 5
B = 0
C = A % B
`);

    step(program);
    step(program);
    expect(() => step(program)).toThrow("Modulo by zero is not allowed");
  });

  it("throws a readable error for missing THEN", () => {
    const program = compile(`
IF X > 0
PRINT X
END
`);

    expect(() => step(program)).toThrow("Missing THEN in IF statement");
  });
});
