"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { parseLine, step, reset } from "@/lib/engine";
import { setVariable } from "@/lib/engine";
import { useParams } from "next/navigation";
import Editor, { useMonaco } from "@monaco-editor/react";
import { AuthGuard } from "@/components/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";


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

function ProblemContent({ user }: any) {
  const params = useParams();
  const rawId = params.id;

  const id =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : undefined;

  if (!id) {
    return <div className="p-6">Invalid problem id</div>;
  }

  const problem = problems[id];

  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode);
    }
    setLoading(false);
  }, [problem]);

  async function runCode() {
    let results: any[] = [];

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
        let msg = "Unknown error";

        if (typeof e === "string") {
          msg = e;
        } else if (e?.message) {
          msg = e.message;
        } else {
          msg = JSON.stringify(e);
        }

        out.push("ERROR: " + msg);
      }

      results.push(out.join("\n") === test.output);
    }

    const score = Math.round(
      (results.filter(Boolean).length / results.length) * 100
    );

    setResult(`Score: ${score}%`);

    await supabase.from("submissions").insert([
      {
        user_id: user.id,
        problem_id: id,
        code,
        score,
      },
    ]);
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
          [/\b(IF|THEN|ELSE|END|WHILE|PRINT|INPUT)\b/, "keyword"],
          [/[0-9]+/, "number"],
          [/".*?"/, "string"],
          [/<=|>=|==|!=|<|>/, "operator"],
        ],
      },
    });

    monaco.editor.defineTheme("miniscriptplusTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [{ token: "keyword", foreground: "c586c0" }],
      colors: {},
    });
  }, [monaco]);

  if (!problem) return <div className="p-6">Problem not found</div>;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)]">
        <Skeleton className="w-1/2 h-full" />
        <Skeleton className="w-1/2 h-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex">

      <div className="w-1/2 border-r p-6">
        <h1 className="text-2xl font-bold">{problem.title}</h1>
        <p className="text-muted-foreground">{problem.description}</p>
      </div>

      <div className="w-1/2 p-6 flex flex-col gap-4">

        <div className="flex-1 border rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="miniscriptplus"
            theme="miniscriptplusTheme"
            value={code}
            onChange={(value) => setCode(value || "")}
          />
        </div>

        <button
          onClick={runCode}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Submit
        </button>

        {result && <div className="font-bold">{result}</div>}
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