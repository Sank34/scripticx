import "server-only";

import {
  advanceLine,
  parseLine,
  reset,
  setVariable,
  step,
} from "@/lib/engine";

export type ServerTestCase = {
  input: Array<string | number | boolean>;
  output: string;
};

export type ServerTestResult = {
  passed: boolean;
  expected: string;
  got: string;
  input: Array<string | number | boolean>;
};

const MAX_CODE_LENGTH = 20_000;
const MAX_CODE_LINES = 1_000;
const MAX_TESTS = 50;
const MAX_INPUTS_PER_TEST = 100;
const MAX_EXPECTED_LENGTH = 20_000;
const MAX_OUTPUT_LENGTH = 20_000;

function normalize(value: string) {
  return value.trim().replace(/\r\n/g, "\n");
}

export function validateTestCases(value: unknown): ServerTestCase[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TESTS) {
    throw new Error("Problem test configuration is invalid");
  }

  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("Problem test configuration is invalid");
    }

    const test = candidate as { input?: unknown; output?: unknown };
    if (
      !Array.isArray(test.input) ||
      test.input.length > MAX_INPUTS_PER_TEST ||
      test.input.some(
        (entry) =>
          typeof entry !== "string" &&
          typeof entry !== "number" &&
          typeof entry !== "boolean"
      ) ||
      typeof test.output !== "string" ||
      test.output.length > MAX_EXPECTED_LENGTH
    ) {
      throw new Error("Problem test configuration is invalid");
    }

    return {
      input: test.input as Array<string | number | boolean>,
      output: test.output,
    };
  });
}

export function evaluateMiniScript(
  code: string,
  testCases: ServerTestCase[]
): { score: number; results: ServerTestResult[] } {
  if (
    code.length === 0 ||
    code.length > MAX_CODE_LENGTH ||
    code.split("\n").length > MAX_CODE_LINES
  ) {
    throw new Error("Code is empty or too large");
  }

  const program = code.split("\n").map(parseLine);
  const results = testCases.map((test) => {
    reset();
    const output: string[] = [];
    let outputLength = 0;
    let inputIndex = 0;

    try {
      while (true) {
        const result = step(program);
        if (!result) break;

        if (result.inputRequest) {
          if (inputIndex >= test.input.length) {
            throw new Error("Not enough test input");
          }
          setVariable(result.inputRequest, test.input[inputIndex++]);
          advanceLine();
          continue;
        }

        if (result.output !== null) {
          const line = String(result.output);
          outputLength += line.length;
          if (outputLength > MAX_OUTPUT_LENGTH) {
            throw new Error("Program output is too large");
          }
          output.push(line);
        }
      }
    } catch (error) {
      output.push(`Error: ${error instanceof Error ? error.message : "Execution failed"}`);
    }

    const got = normalize(output.join("\n"));
    const expected = normalize(test.output);
    return { passed: got === expected, got, expected, input: test.input };
  });

  return {
    score: Math.round(
      (results.filter((result) => result.passed).length / results.length) * 100
    ),
    results,
  };
}
