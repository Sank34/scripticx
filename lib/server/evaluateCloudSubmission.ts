import "server-only";

import type { CodeExecutionResult } from "@/lib/code-runner";
import { executeCode, CodeExecutionTimeout } from "@/lib/server/codeRunner";
import { normalizeTestOutput, scoreTestResults, type ServerTestCase, type ServerTestResult } from "@/lib/server/evaluateMiniScript";
import { HttpError } from "@/lib/server/requestSecurity";

const PARALLEL_TESTS = 4;
const MAX_STDIN_BYTES = 64 * 1024;
const MAX_RESULT_LENGTH = 20_000;

export async function evaluateCloudSubmission(
  language: "python" | "cpp",
  code: string,
  tests: ServerTestCase[]
) {
  const inputs = tests.map(({ input }) => input.length ? input.join("\n") + "\n" : "");
  if (inputs.some((input) => new TextEncoder().encode(input).byteLength > MAX_STDIN_BYTES)) {
    throw new HttpError(422, "Problem test input is too large");
  }

  const files = [{ name: language === "python" ? "main.py" : "main.cpp", content: code }];
  async function evaluateTest(index: number): Promise<ServerTestResult> {
    const test = tests[index];
    const expected = normalizeTestOutput(test.output);
    const base = { input: test.input, expected };

    let execution: CodeExecutionResult;
    try {
      execution = await executeCode({ language, files, args: [], stdin: inputs[index] });
    } catch (error) {
      if (error instanceof CodeExecutionTimeout) {
        return { ...base, got: "", passed: false, failure: "timeLimit" };
      }
      throw error;
    }

    const got = normalizeTestOutput(execution.run.stdout);
    const compileFailed = execution.compile != null && execution.compile.code !== 0;
    const failure = compileFailed ? "compilationError" : !execution.success ? "runtimeError" : undefined;
    const diagnostics = failure
      ? (compileFailed ? execution.compile?.output : execution.run.stderr || execution.run.message)?.slice(0, 2_000)
      : undefined;
    return {
      ...base,
      got: got.slice(0, MAX_RESULT_LENGTH),
      passed: execution.success && got === expected,
      failure,
      diagnostics,
    };
  }

  // Each test has its own sandbox and receives only its own stdin.
  const first = await evaluateTest(0);
  if (first.failure === "compilationError") {
    const remaining = tests.slice(1).map((test): ServerTestResult => ({
      input: test.input,
      expected: normalizeTestOutput(test.output),
      got: "",
      passed: false,
      failure: "compilationError",
    }));
    return { score: 0, results: [first, ...remaining] };
  }

  const results = [first];
  for (let start = 1; start < tests.length; start += PARALLEL_TESTS) {
    const batch = await Promise.all(tests.slice(start, start + PARALLEL_TESTS)
      .map((_, offset) => evaluateTest(start + offset)));
    results.push(...batch);
  }
  return { score: scoreTestResults(results), results };
}
