"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";
import Editor, { useMonaco } from "@monaco-editor/react";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { checkAchievements } from "@/lib/achievements";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import { Markdown } from "@/components/Markdown";

function ProblemContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { role } = useUserRole(user);

  const params = useParams();
  const id = params?.id;

  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function fetchProblem() {
      const { data } = await supabase
        .from("problems")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setProblem(data);
        setCode(data.starter_code);
      }

      setLoading(false);
    }

    fetchProblem();
  }, [id]);

  async function runCode() {
    if (!problem || !user) return;

    let results: any[] = [];

    for (const test of problem.test_cases) {
      let program;

      try {
        program = code.split("\n").map(parseLine);
      } catch (e: any) {
        setResult(`${t("problemPage.result.error")}: ${e.message}`);
        return;
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
        out.push(`${t("problemPage.result.error")}: ${e.message}`);
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

    setResult(`${t("problemPage.result.score")}: ${score}%`);
    setTestResults(results);

    const { data: previous } = await supabase
      .from("submissions")
      .select("score")
      .eq("user_id", user.id)
      .eq("problem_id", id);

    const bestPrevious =
      previous?.length
        ? Math.max(...previous.map((s) => s.score))
        : 0;

    await supabase.from("submissions").insert([
      {
        user_id: user.id,
        problem_id: id,
        code,
        score,
      },
    ]);

    if (score > bestPrevious) {
      const diff = score - bestPrevious;

      const { data: profile } = await supabase
        .from("profiles")
        .select("total_score")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({
          total_score: (profile?.total_score || 0) + diff,
        })
        .eq("id", user.id);
    }

    await checkAchievements(user.id, score);
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
    return <div className="p-6">{t("problemPage.notFound")}</div>;
  }

  const passedCount = testResults.filter((r) => r.passed).length;

  return (
    <div className="h-[calc(100vh-80px)] flex">

      <div className="w-1/2 flex flex-col bg-zinc-950 text-zinc-100 border-r">

        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              MiniScript+
            </span>
          </div>
          <button
            onClick={runCode}
            className="px-3 py-1.5 text-xs font-medium bg-white text-zinc-900 rounded-md hover:bg-zinc-200 transition"
          >
            {t("problemPage.actions.submit")}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
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
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>

        {(result || testResults.length > 0) && (
          <div className="max-h-[40%] overflow-y-auto border-t border-zinc-800 bg-zinc-900">
            {result && (
              <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {t("problemPage.tests.results") || "Results"}
                </span>
                <span className="text-sm font-semibold text-zinc-100">
                  {result}
                  {testResults.length > 0 && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({passedCount}/{testResults.length})
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="p-3 space-y-2">
              {testResults.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-3 ${
                    r.passed
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-red-500/40 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {t("problemPage.tests.test")} #{i + 1}
                    </p>
                    {r.passed ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <X size={16} className="text-red-400" />
                    )}
                  </div>

                  <div className="text-xs mt-2 space-y-1.5 text-zinc-300">
                    <p>
                      <span className="text-zinc-500">
                        {t("problemPage.tests.input")}:
                      </span>{" "}
                      {JSON.stringify(r.input)}
                    </p>

                    {!r.passed && (
                      <>
                        <div>
                          <p className="text-zinc-500">
                            {t("problemPage.tests.expected")}:
                          </p>
                          <pre className="mt-1 rounded bg-zinc-950 px-2 py-1 font-mono text-[11px]">
                            {r.expected}
                          </pre>
                        </div>
                        <div>
                          <p className="text-zinc-500">
                            {t("problemPage.tests.got")}:
                          </p>
                          <pre className="mt-1 rounded bg-zinc-950 px-2 py-1 font-mono text-[11px]">
                            {r.got}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-1/2 overflow-y-auto">
        <div className="px-8 py-6 space-y-4 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight">
            {problem.code != null && (
              <span className="mr-2 text-muted-foreground font-mono">
                #{problem.code}
              </span>
            )}
            {getLocalized(problem.title_i18n, locale)}
          </h1>
          <div className="text-sm leading-relaxed text-zinc-700">
            <Markdown>{getLocalized(problem.description_i18n, locale)}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProblemPage() {
  return (
    <RouteGuard requireAuth>
      <ProblemContent />
    </RouteGuard>
  );
}