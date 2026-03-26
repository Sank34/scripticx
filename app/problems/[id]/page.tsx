"use client";

import { useState, useEffect } from "react";
import { parseLine, step, reset } from "@/lib/engine";
import { setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";
import Editor, { useMonaco } from "@monaco-editor/react";

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

  //add miniscriptplus syntax support
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;

    // register language
    monaco.languages.register({ id: "miniscriptplus" });

    // syntax rules
    monaco.languages.setMonarchTokensProvider("miniscriptplus", {
      tokenizer: {
        root: [
          [/\b(IF|THEN|ELSE|END|WHILE|PRINT|INPUT)\b/, "keyword"],
          [/\b(true|false)\b/, "constant"],
          [/[0-9]+/, "number"],
          [/".*?"/, "string"],
          [/<=|>=|==|!=|<|>/, "operator"],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
        ],
      },
    });

    monaco.languages.registerCompletionItemProvider("miniscript", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: [
            {
              label: "PRINT",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "PRINT ",
              range,
            },
            {
              label: "INPUT",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "INPUT ",
              range,
            },
            {
              label: "IF",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: [
                "IF ${1:condition} THEN",
                "\t$0",
                "END",
              ].join("\n"),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "WHILE",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: [
                "WHILE ${1:condition}",
                "\t$0",
                "END",
              ].join("\n"),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "ELSE",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "ELSE",
              range,
            },
            {
              label: "END",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "END",
              range,
            },
            {
              label: "true",
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: "true",
              range,
            },
            {
              label: "false",
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: "false",
              range,
            },
          ],
        };
      },
    });

    // theme
    monaco.editor.defineTheme("miniscriptplusTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "c586c0" },
        { token: "number", foreground: "b5cea8" },
        { token: "string", foreground: "ce9178" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "constant", foreground: "569cd6" },
      ],
      colors: {},
    });
  }, [monaco]);

  return (
    <div className="h-[calc(100vh-80px)] flex">

      {/* LEFT SIDE - PROBLEM */}
      <div className="w-1/2 border-r p-6 overflow-y-auto space-y-4">

        <h1 className="text-2xl font-bold">{problem.title}</h1>

        <p className="text-muted-foreground">
          {problem.description}
        </p>

        {/* examples.. */}

      </div>

      {/* RIGHT SIDE - EDITOR */}
      <div className="w-1/2 p-6 flex flex-col gap-4">

        {/* EDITOR */}
        <div className="flex-1 border rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="miniscriptplus"
            theme="miniscriptplusTheme"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",

              quickSuggestions: true,
              suggestOnTriggerCharacters: true
            }}
          />
        </div>

        {/* BUTTON */}
        <div>
          <button
            onClick={runCode}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Submit
          </button>
        </div>

        {/* RESULTS */}
        <div className="space-y-2 overflow-y-auto max-h-60">

          {testResults.length > 0 && (
            <>
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
            </>
          )}

          {result && (
            <div className="text-lg font-bold">
              {result}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}