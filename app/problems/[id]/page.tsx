"use client";

import { useState, useEffect } from "react";
import { parseLine, step, reset } from "@/lib/engine";
import { setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";

const problems: any = {
  "1": {
    title: "Sum of two numbers",
    description: "Read X and Y and print their sum",
    starterCode: `INPUT X
INPUT Y
PRINT X + Y`,
    testCases: [
      { input: [3, 4], output: "7" },
      { input: [10, 2], output: "12" }
    ]
  },
  "2": {
    title: "Print numbers",
    description: "Print numbers from 1 to 3",
    starterCode: `X = 1
WHILE X <= 3
PRINT X
X = X + 1
END`,
    testCases: [
      { input: [], output: "1\n2\n3" }
    ]
  },
};

export default function ProblemPage() {
  const params = useParams();
  const problem = problems[params.id as string];

  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
  { passed: boolean; expected: string; got: string }[]
  >([]);

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode);
    }
  }, [problem]);

    function runCode() {
      let results: {
        passed: boolean;
        expected: string;
        got: string;
      }[] = [];

      for (const test of problem.testCases) {
        const program = code.split("\n").map(parseLine);

        reset();

        let res;
        let out: string[] = [];
        let inputIndex = 0;

        try {
          while (true) {
            res = step(program);

            if (!res) break;

            if ((res as any).inputRequest) {
              const varName = (res as any).inputRequest;
              const value = test.input[inputIndex++];

              setVariable(varName, value);
              continue;
            }

            if (res.output !== null) {
              out.push(String(res.output));
            }
          }
        } catch (e: any) {
          out.push("ERROR: " + e.message);
        }

        const result = out.join("\n");

        results.push({
          passed: result.trim() === test.output.trim(),
          expected: test.output,
          got: result,
        });
      }

      setTestResults(results);

      const passedCount = results.filter(r => r.passed).length;
      const score = Math.round((passedCount / results.length) * 100);

      setResult(`Score: ${score}%`);

      return results;
    }
    function handleSubmit() {
        runCode();
    }

  if (!problem) {
    return <div className="p-6">Problem not found</div>;
  }

  return (
    <div className="p-6 space-y-6">

      {/* TITLE */}
      <h1 className="text-2xl font-bold">{problem.title}</h1>

      {/* DESCRIPTION */}
      <p className="text-muted-foreground">{problem.description}</p>

      {/* EDITOR */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-40 font-mono border p-3 rounded"
      />

      {/* BUTTONS */}
      <div className="flex gap-2">
        <button
          onClick={runCode}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Submit
        </button>
      </div>


      {testResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Test Results</h3>

          {testResults.map((t, i) => (
            <div
              key={i}
              className={`p-2 rounded text-sm ${
                t.passed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              Test {i + 1}: {t.passed ? " Passed" : " Failed"}

              {!t.passed && (
                <div className="mt-1 text-xs">
                  <div>Expected: {t.expected}</div>
                  <div>Got: {t.got}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="text-lg font-bold">
          {result}
        </div>
      )}

    </div>
  );
}