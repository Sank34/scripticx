"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import type { OnMount } from "@monaco-editor/react";
import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";
import { useParams } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import {
  TestResultCard,
  type ProblemTestResult,
} from "@/components/problems/TestResultCard";
import { useAuth } from "@/hooks/useAuth";
import { api, type DailyChallenge } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAchievements } from "@/lib/achievements";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Play, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

type EvaluationStatus = {
  status: "pending" | "evaluating" | "passed" | "failed";
};

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, 120);
    });
  });
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationStatuses, setEvaluationStatuses] = useState<EvaluationStatus[]>([]);
  const [editorLine, setEditorLine] = useState(1);
  const [tabSize, setTabSize] = useState(2);
  const [activeTab, setActiveTab] = useState<"description" | "solution">("description");
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function fetchProblem() {
      const [{ data }, todayChallenge] = await Promise.all([
        supabase
          .from("problems")
          .select("*, author:profiles!problems_author_id_fkey(id, username, avatar_url)")
          .eq("id", id)
          .single(),
        api.dailyChallenges.getForDate(),
      ]);

      if (data) {
        setProblem(data);
        setCode(data.starter_code);
      }

      const matchingDailyChallenge =
        todayChallenge?.problem_id === id ? todayChallenge : null;

      if (matchingDailyChallenge) {
        setDailyChallenge(matchingDailyChallenge);

        if (user?.id) {
          const completion = await api.dailyChallenges.getCompletion(
            matchingDailyChallenge.id,
            user.id
          );
          setDailyCompleted(Boolean(completion));
        }
      } else {
        setDailyChallenge(null);
        setDailyCompleted(false);
      }

      setLoading(false);
    }

    fetchProblem();
  }, [id, user?.id]);

  async function runCode() {
    if (!problem || !user) return;

    setIsSubmitting(true);
    setActiveTab("solution");
    setTestResults([]);
    setEvaluationStatuses(
      problem.test_cases.map(() => ({ status: "pending" }))
    );
    const results: ProblemTestResult[] = [];

    try {
      for (const [index, test] of problem.test_cases.entries()) {
        setEvaluationStatuses((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { status: "evaluating" } : item
          )
        );
        await waitForPaint();

        let program;

        try {
          program = code.split("\n").map(parseLine);
        } catch (e: any) {
          setResult(`${t("problemPage.result.error")}: ${e.message}`);
          setEvaluationStatuses((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? { status: "failed" } : item
            )
          );
          return;
        }

        reset();

        let res;
        const out: string[] = [];
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
        const passed = got === expected;

        results.push({
          passed,
          expected,
          got,
          input: test.input,
        });

        setEvaluationStatuses((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? { status: passed ? "passed" : "failed" }
              : item
          )
        );
        await waitForPaint();
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

      let bonusAwarded = false;

      if (score === 100 && dailyChallenge && !dailyCompleted) {
        bonusAwarded = await api.dailyChallenges.complete({
          challengeId: dailyChallenge.id,
          userId: user.id,
          problemId: String(id),
          bonusPoints: dailyChallenge.bonus_points || 0,
        });

        if (bonusAwarded) {
          setDailyCompleted(true);
        }
      }

      const scoreIncrement = score > bestPrevious ? score - bestPrevious : 0;
      const bonusIncrement = bonusAwarded ? dailyChallenge?.bonus_points || 0 : 0;
      const totalIncrement = dailyChallenge ? bonusIncrement : scoreIncrement;

      if (totalIncrement > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_score")
          .eq("id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({
            total_score: (profile?.total_score || 0) + totalIncrement,
          })
          .eq("id", user.id);
      }

      await checkAchievements(user.id, score);

      if (bonusAwarded && bonusIncrement > 0) {
        toast.success(
          locale === "ro"
            ? `Daily challenge rezolvat! Ai primit ${bonusIncrement} puncte bonus.`
            : `Daily challenge solved! You received ${bonusIncrement} bonus points.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEditorMount: OnMount = (editor) => {
    const syncLine = () => {
      setEditorLine(editor.getPosition()?.lineNumber ?? 1);
    };

    syncLine();
    editor.onDidChangeCursorPosition(syncLine);
    editor.onDidFocusEditorText(syncLine);
    editor.onDidChangeModelContent(syncLine);
  };

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
  const score = testResults.length
    ? Math.round((passedCount / testResults.length) * 100)
    : 0;
  const localizedTitle = getLocalized(problem.title_i18n, locale);
  const fileName = `${slugify(
    getLocalized(problem.title_i18n, "en") || localizedTitle
  )}.msp`;
  const tabSizeControl = (
    <Select
      value={String(tabSize)}
      onValueChange={(value) => setTabSize(Number(value))}
    >
      <SelectTrigger
        size="sm"
        className="h-7 border-zinc-200 bg-white px-2 text-xs text-zinc-600"
        aria-label={t("live.tabSize")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {[2, 3, 4, 8].map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size} {t("live.spaces")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold md:text-base">
              {problem.code != null && (
                <span className="mr-1 text-zinc-500">#{problem.code}</span>
              )}
              {localizedTitle}
            </h1>
            {dailyChallenge && (
              <Badge className="hidden bg-orange-600 hover:bg-orange-600 md:inline-flex">
                Daily code challenge
              </Badge>
            )}
            {dailyCompleted && (
              <Badge className="hidden bg-emerald-600 hover:bg-emerald-600 md:inline-flex">
                {t("problems.status.solved")}
              </Badge>
            )}
            {testResults.length > 0 && (
              <Badge
                variant={passedCount === testResults.length ? "default" : "secondary"}
                className="hidden md:inline-flex"
              >
                {score}%
              </Badge>
            )}
          </div>
          <div className="hidden text-xs text-zinc-500 md:block">
            {fileName}
          </div>
        </div>

        <Button
          size="sm"
          onClick={runCode}
          disabled={isSubmitting}
          className="gap-2"
        >
          {testResults.length > 0 ? <CheckCircle2 size={15} /> : <Send size={15} />}
          {t("problemPage.actions.submit")}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(320px,46vh)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_390px] md:grid-rows-1">
        <main className="flex min-h-0 min-w-0 flex-col bg-white">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 bg-white md:border-b-0 md:border-r">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="ml-2 truncate text-xs font-medium text-zinc-700">
                  {fileName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Play size={13} />
                <span>MiniScript+</span>
              </div>
            </div>

            <CodeEditorContextMenu
              code={code}
              fileName={fileName}
              onChange={setCode}
              onSubmit={runCode}
            >
              <div className="min-h-0 flex-1 overflow-hidden">
                <MiniScriptMonacoEditor
                  onMount={handleEditorMount}
                  height="100%"
                  value={code}
                  onChange={setCode}
                  options={{
                    contextmenu: false,
                    padding: { top: 16, bottom: 16 },
                    smoothScrolling: true,
                    wordWrap: "on",
                    automaticLayout: true,
                    cursorSmoothCaretAnimation: "on",
                    cursorBlinking: "smooth",
                    scrollbar: {
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    tabSize,
                    insertSpaces: true,
                    wrappingIndent: "same",
                  }}
                />
              </div>
            </CodeEditorContextMenu>
          </div>

          <div className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
            <span>Ln {editorLine}</span>
            <div className="flex items-center gap-2">
              <span>{t("live.tabSize")}</span>
              {tabSizeControl}
              <span>· MSP</span>
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-hidden border-t border-zinc-200 bg-white md:border-t-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "description" | "solution")}
            className="flex h-full min-h-0 flex-col gap-0"
          >
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-none border-b bg-zinc-50 px-3">
              <TabsTrigger value="description" className="text-sm">
                {t("problemPage.tabs.description") || "Cerință"}
              </TabsTrigger>
              <TabsTrigger value="solution" className="text-sm" disabled={!isSubmitting && testResults.length === 0}>
                {t("problemPage.tabs.solution") || "Soluția mea"}
                {testResults.length > 0 && (
                  <span className={`ml-2 text-xs font-semibold ${passedCount === testResults.length ? "text-emerald-600" : "text-red-600"}`}>
                    {score}%
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-0 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-5 py-5">
                <div className="space-y-1.5">
                  {problem.author?.username && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {t("problemPage.publishedBy")}
                      <Link
                        href={`/u/${problem.author.username}`}
                        className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
                      >
                        <UserAvatar
                          avatarUrl={problem.author.avatar_url}
                          username={problem.author.username}
                          className="h-5 w-5"
                        />
                        {problem.author.username}
                      </Link>
                    </p>
                  )}
                  <h2 className="text-xl font-bold tracking-tight">
                    {localizedTitle}
                  </h2>
                </div>
                {dailyChallenge && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-orange-600 hover:bg-orange-600">
                      Daily code challenge
                    </Badge>
                    <Badge variant="secondary">
                      +{dailyChallenge.bonus_points || 0} pts
                    </Badge>
                    {dailyCompleted && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">
                        {t("problems.status.solved")}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="text-sm leading-relaxed text-zinc-700">
                  <Markdown>{getLocalized(problem.description_i18n, locale)}</Markdown>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="solution" className="mt-0 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-5 py-5">
                {isSubmitting && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("problemPage.evaluation.title") || "Se evaluează soluția..."}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {t("problemPage.evaluation.subtitle") || "Rulăm soluția pe fiecare test case."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {evaluationStatuses.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-medium">
                            {t("problemPage.evaluation.testCase") || "Test case"} {index + 1}/{evaluationStatuses.length}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              item.status === "passed"
                                ? "text-emerald-600"
                                : item.status === "failed"
                                  ? "text-red-600"
                                  : item.status === "evaluating"
                                    ? "text-amber-600"
                                    : "text-zinc-400"
                            }`}
                          >
                            {item.status === "evaluating" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {item.status === "passed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {item.status === "failed" && <XCircle className="h-3.5 w-3.5" />}
                            {t(`problemPage.evaluation.${item.status}`)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                )}

                {!isSubmitting && testResults.length > 0 && (
                  <>
                    <div>
                      {dailyChallenge && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge className="bg-orange-600 hover:bg-orange-600">
                            Daily code challenge
                          </Badge>
                          <Badge variant="secondary">
                            {dailyCompleted
                              ? locale === "ro"
                                ? "Bonus revendicat"
                                : "Bonus claimed"
                              : `+${dailyChallenge.bonus_points || 0} pts`}
                          </Badge>
                        </div>
                      )}
                      <h2 className={`text-3xl font-bold ${passedCount === testResults.length ? "text-emerald-600" : "text-red-600"}`}>
                        {score} {t("problemPage.solution.points") || "puncte"}
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
        </aside>
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
