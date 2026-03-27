"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { parseLine, step, reset } from "@/lib/engine";
import { setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";
import Editor, { useMonaco } from "@monaco-editor/react";
import { AuthGuard } from "@/components/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

function ProblemContent({ user }: any) {

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.reason?.type === "cancelation") {
        e.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handler);

    return () => {
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  const params = useParams();
  const id = params?.id;

  const { role } = useUserRole(user);

  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function fetchProblem() {
      const { data, error } = await supabase
        .from("problems")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProblem(data);
        setCode(data.starter_code);
      }

      setLoading(false);
    }

    fetchProblem();
  }, [id]);

  async function runCode() {
    if (!problem) return;

    let results: {
      passed: boolean;
      expected: string;
      got: string;
      input: any;
    }[] = [];

    for (const test of problem.test_cases) {
      let program;

      try {
        program = code.split("\n").map(parseLine);
      } catch (e: any) {
        const msg = e?.message || JSON.stringify(e);
        setResult(`ERROR: ${msg}`);
        return;
      }

      for (let i = 0; i < program.length; i++) {
        if (program[i].type === "ERROR") {
          setResult(`ERROR (line ${i + 1}): ${program[i].message}`);
          return;
        }
      }

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
            advanceLine();
            continue;
          }

          if (res.output !== null) {
            out.push(String(res.output));
          }
        }
      } catch (e: any) {
        let msg = e?.message || JSON.stringify(e);

        out.push(
          `ERROR${e?.line ? ` (line ${e.line})` : ""}: ${msg}`
        );
      }

      const normalize = (str: string) =>
        str.trim().replace(/\r\n/g, "\n");

      const got = normalize(out.join("\n"));
      const expected = normalize(test.output);

      results.push({
        passed: got === expected,
        expected,
        got,
        input: test.input,
      });
    }

    const score = Math.round(
      (results.filter(r => r.passed).length / results.length) * 100
    );

    setResult(`Score: ${score}%`);
    setTestResults(results);

    const { error } = await supabase.from("submissions").insert([
      {
        user_id: user.id,
        problem_id: id,
        code,
        score,
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
    }
  }

  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;

    if (monaco.languages.getLanguages().some(l => l.id === "miniscriptplus")) {
      return;
    }

    monaco.languages.register({ id: "miniscriptplus" });

    monaco.languages.setMonarchTokensProvider("miniscriptplus", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          [/\b(IF|THEN|ELSE|END|WHILE|PRINT|INPUT)\b/, "keyword"],
          [/\b(true|false)\b/, "constant"],
          [/[0-9]+/, "number"],
          [/".*?"/, "string"],
          [/<=|>=|==|!=|<|>/, "operator"],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
        ],
      },
    });

    monaco.editor.defineTheme("miniscriptplusTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "c586c0" },
        { token: "number", foreground: "b5cea8" },
        { token: "string", foreground: "ce9178" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "constant", foreground: "569cd6" },
      ],
      colors: {},
    });

  }, [monaco]);

  if (!id || typeof id !== "string" || loading) {
    return (
      <div className="flex h-[calc(100vh-80px)]">
        <Skeleton className="w-1/2 h-full" />
        <Skeleton className="w-1/2 h-full" />
      </div>
    );
  }

  if (!problem) {
    return <div className="p-6">Problem not found</div>;
  }

  return (
    <div className="h-[calc(100vh-80px)] flex">

      {/* LEFT */}
      <div className="w-1/2 border-r p-6">
        <h1 className="text-2xl font-bold">{problem.title}</h1>
        <p className="text-muted-foreground">{problem.description}</p>
      </div>

      {/* RIGHT */}
      <div className="w-1/2 p-6 flex flex-col gap-4">

        <div className="flex-1 border rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="miniscriptplus"
            theme="miniscriptplusTheme"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
            }}
          />
        </div>

        <button
          onClick={runCode}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Submit
        </button>

        {result && <div className="font-bold">{result}</div>}

        {/* TEST RESULTS */}
        <div className="space-y-3">
          {testResults.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded border ${
                r.passed ? "border-green-500" : "border-red-500"
              }`}
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold">Test #{i + 1}</p>

                {r.passed ? (
                  <Check className="text-green-500" size={20} />
                ) : (
                  <X className="text-red-500" size={20} />
                )}
              </div>

              <p className="text-sm mt-2">
                Input: {JSON.stringify(r.input)}
              </p>

              {role === "admin" && !r.passed && (
                <>
                  <p className="text-sm mt-2 font-medium">Expected:</p>
                  <pre className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">
                    {r.expected}
                  </pre>

                  <p className="text-sm mt-2 font-medium">Got:</p>
                  <pre className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">
                    {r.got}
                  </pre>
                </>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function ProblemPage() {
  return (
    <AuthGuard>
      {(user: any) => <ProblemContent user={user} />}
    </AuthGuard>
  );
}