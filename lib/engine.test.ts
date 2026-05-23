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

  it("keeps looping when a while body contains an if else block", () => {
    const program = compile(`
A = 20
B = 8
WHILE A != B
  IF A > B THEN
    A = A - B
  ELSE
    B = B - A
  END
END
PRINT A
`);

    let lastOutput = null;
    let current = step(program);

    while (current) {
      if (current.output !== null) lastOutput = current.output;
      current = step(program);
    }

    expect(lastOutput).toBe(4);
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

  it("supports unary minus for negative literals and variables", () => {
    const negativeLiteral = compile(`
N = -5
PRINT (-1) * N
`);

    expect(step(negativeLiteral)).toMatchObject({
      variables: { N: -5 },
    });
    expect(step(negativeLiteral)).toMatchObject({
      output: 5,
    });

    reset();

    const negativeVariable = compile(`
N = 7
PRINT -N
`);

    expect(step(negativeVariable)).toMatchObject({
      variables: { N: 7 },
    });
    expect(step(negativeVariable)).toMatchObject({
      output: -7,
    });
  });

  it("supports integer division and MOD alias for digit algorithms", () => {
    const program = compile(`
N = 123
CIF = N MOD 10
N = N DIV 10
PRINT CIF
PRINT N
`);

    step(program);
    expect(step(program)).toMatchObject({
      variables: { N: 123, CIF: 3 },
    });
    expect(step(program)).toMatchObject({
      variables: { N: 12, CIF: 3 },
    });
    expect(step(program)).toMatchObject({
      output: 3,
    });
    expect(step(program)).toMatchObject({
      output: 12,
    });
  });

  it("supports numeric helper functions", () => {
    const program = compile(`
A = INT(7.9)
B = FLOOR(-1.2)
C = ROUND(2.6)
D = ABS(-5)
PRINT A + B + C + D
`);

    step(program);
    step(program);
    step(program);
    step(program);

    expect(step(program)).toMatchObject({
      output: 13,
      variables: {
        A: 7,
        B: -2,
        C: 3,
        D: 5,
      },
    });
  });

  it("supports ROUND with decimal places", () => {
    const program = compile(`
A = ROUND(3.14159, 2)
B = ROUND(12.345, 1)
C = ROUND(12.345, 0)
PRINT A
PRINT B
PRINT C
`);

    step(program);
    step(program);
    step(program);

    expect(step(program)).toMatchObject({
      output: 3.14,
    });
    expect(step(program)).toMatchObject({
      output: 12.3,
    });
    expect(step(program)).toMatchObject({
      output: 12,
    });
  });

  it("throws when ROUND receives invalid decimal places", () => {
    const program = compile(`
PRINT ROUND(3.14159, 1.5)
`);

    expect(() => step(program)).toThrow(
      "ROUND decimals must be a non-negative integer"
    );
  });

  it("supports boolean literals in conditions", () => {
    const program = compile(`
OK = TRUE
IF OK == TRUE THEN
PRINT "yes"
ELSE
PRINT "no"
END
`);

    let lastOutput = null;
    let current = step(program);
    while (current) {
      if (current.output !== null) lastOutput = current.output;
      current = step(program);
    }

    expect(lastOutput).toBe("yes");
  });

  it("throws readable errors when numeric operators receive non-numbers", () => {
    const program = compile(`
TEXT = "abc"
PRINT TEXT - 1
`);

    step(program);
    expect(() => step(program)).toThrow("Operator - can only be used with numbers");
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
