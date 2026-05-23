"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import {
  TestResultCard,
  type ProblemTestResult,
} from "@/components/problems/TestResultCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAchievements } from "@/lib/achievements";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import { Markdown } from "@/components/Markdown";

function slugify(text: string): string {
  if (!text) return "problem";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function ProblemContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const params = useParams();
  const id = params?.id;

  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [, setResult] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<ProblemTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"description" | "solution">("description");

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

    const results: ProblemTestResult[] = [];

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
    setActiveTab("solution");

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

  if (!id || typeof id !== "string" || loading) {
    return (
      <div className="flex h-full">
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
    <div className="h-full flex flex-col-reverse md:flex-row">

      <div className="w-full md:w-1/2 flex flex-col bg-zinc-950 text-zinc-100 md:border-r flex-1 md:flex-none min-h-[60vh] md:min-h-0">

        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
          <span className="text-xs font-mono text-zinc-400">
            {slugify(getLocalized(problem.title_i18n, "en") || getLocalized(problem.title_i18n, locale))}.msp
          </span>
          <button
            onClick={runCode}
            className="px-3 py-1.5 text-xs font-medium bg-white text-zinc-900 rounded-md hover:bg-zinc-200 transition"
          >
            {t("problemPage.actions.submit")}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <MiniScriptMonacoEditor
            height="100%"
            value={code}
            onChange={setCode}
            theme="dark"
            options={{
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col overflow-hidden border-b md:border-b-0">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "description" | "solution")}
          className="flex flex-1 flex-col overflow-hidden gap-0"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-white px-4 h-11 flex-shrink-0">
            <TabsTrigger value="description" className="text-sm">
              {t("problemPage.tabs.description") || "Cerință"}
            </TabsTrigger>
            <TabsTrigger value="solution" className="text-sm" disabled={testResults.length === 0}>
              {t("problemPage.tabs.solution") || "Soluția mea"}
              {testResults.length > 0 && (
                <span className={`ml-2 text-xs font-semibold ${passedCount === testResults.length ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.round((passedCount / testResults.length) * 100)}%
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="flex-1 overflow-y-auto mt-0">
            <div className="px-6 md:px-8 py-6 space-y-4">
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
          </TabsContent>

          <TabsContent value="solution" className="flex-1 overflow-y-auto mt-0">
            <div className="px-6 md:px-8 py-6 space-y-5">
              {testResults.length > 0 && (
                <>
                  <div>
                    <h2 className={`text-3xl font-bold ${passedCount === testResults.length ? "text-emerald-600" : "text-red-600"}`}>
                      {Math.round((passedCount / testResults.length) * 100)} {t("problemPage.solution.points") || "puncte"}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600">
                      {passedCount === testResults.length
                        ? (t("problemPage.solution.successMessage") || "Felicitări! Codul tău a trecut toate testele.")
                        : (t("problemPage.solution.encouragement") || "Codul tău a obținut un punctaj parțial. Analizează exemplele, încearcă să îți corectezi soluția și trimite o nouă soluție.")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {testResults.map((testResult, index) => (
                      <TestResultCard
                        key={index}
                        index={index}
                        labels={{
                          correct: t("problemPage.tests.correct") || "Răspuns corect",
                          programPrinted: t("problemPage.tests.programPrinted") || "Programul a afișat",
                          programRead: t("problemPage.tests.programRead") || "Programul a citit",
                          shouldHavePrinted: t("problemPage.tests.shouldHavePrinted") || "Programul ar fi trebuit să afișeze",
                          test: t("problemPage.tests.test") || "Test",
                          wrong: t("problemPage.tests.wrong") || "Răspuns greșit",
                        }}
                        result={testResult}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
