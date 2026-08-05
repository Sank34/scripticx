"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnMount } from "@monaco-editor/react";
import { useParams } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { SubmissionHistory } from "@/components/problems/SubmissionHistory";
import {
  TestResultCard,
  type ProblemTestResult,
} from "@/components/problems/TestResultCard";
import { useAuth } from "@/hooks/useAuth";
import { api, type DailyChallenge } from "@/lib/api";
import { competitionApiFetch } from "@/lib/competitionClient";
import type { StandardSubmission } from "@/lib/competitionTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
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

type ProblemPageData = {
  problem: any;
  dailyChallenge: DailyChallenge | null;
  dailyCompleted: boolean;
};

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
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();

  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [code, setCode] = useState("");
  const hydratedProblemId = useRef<string | null>(null);
  const [, setResult] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<ProblemTestResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationStatuses, setEvaluationStatuses] = useState<EvaluationStatus[]>([]);
  const [editorLine, setEditorLine] = useState(1);
  const [tabSize, setTabSize] = useState(2);
  const [activeTab, setActiveTab] = useState<
    "description" | "solution" | "submissions"
  >("description");
  const problemQueryKey = ["problems", "detail", id, user?.id] as const;
  const { data: problemPage, isPending: loading } = useQuery({
    queryKey: problemQueryKey,
    queryFn: async (): Promise<ProblemPageData> => {
      const [{ data, error }, todayChallenge] = await Promise.all([
        supabase
          .from("problems")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        api.dailyChallenges.getForDate(),
      ]);
      if (error) throw error;

      const dailyChallenge =
        todayChallenge?.problem_id === id ? todayChallenge : null;
      const completion = dailyChallenge && user?.id
        ? await api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
        : null;

      return {
        problem: data,
        dailyChallenge,
        dailyCompleted: Boolean(completion),
      };
    },
    enabled: Boolean(id) && !authLoading,
    staleTime: 2 * 60 * 1000,
  });
  const problem = problemPage?.problem || null;
  const dailyChallenge = problemPage?.dailyChallenge || null;
  const dailyCompleted = problemPage?.dailyCompleted || false;
  const submissionsQueryKey = ["problems", "submissions", id, user?.id] as const;
  const submissionsQuery = useQuery<{ submissions: StandardSubmission[] }>({
    queryKey: submissionsQueryKey,
    queryFn: () =>
      competitionApiFetch(`/api/submissions?problemId=${encodeURIComponent(id)}`),
    enabled: Boolean(id && user?.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!problem || hydratedProblemId.current === id) return;
    setCode(problem.starter_code || "");
    hydratedProblemId.current = id;
  }, [id, problem]);

  async function runCode() {
    if (!problem || !user) return;

    setIsSubmitting(true);
    setActiveTab("solution");
    setTestResults([]);
    setEvaluationStatuses(
      problem.test_cases.map(() => ({ status: "pending" }))
    );

    try {
      setEvaluationStatuses(
        problem.test_cases.map(() => ({ status: "evaluating" }))
      );

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw sessionError || new Error("Authentication required");
      }

      const response = await fetch("/api/submissions/evaluate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problemId: id, code }),
      });
      const payload = (await response.json()) as {
        error?: string;
        score?: number;
        results?: ProblemTestResult[];
        bonusAwarded?: boolean;
        bonusPoints?: number;
      };
      if (!response.ok || typeof payload.score !== "number" || !payload.results) {
        throw new Error(payload.error || "Could not evaluate submission");
      }

      const { score, results } = payload;

      setResult(`${t("problemPage.result.score")}: ${score}%`);
      setTestResults(results);
      setEvaluationStatuses(
        results.map((result) => ({
          status: result.passed ? "passed" : "failed",
        }))
      );
      setActiveTab("solution");

      if (payload.bonusAwarded) {
        queryClient.setQueryData<ProblemPageData>(problemQueryKey, (current) =>
          current ? { ...current, dailyCompleted: true } : current
        );
      }

      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["rewards-shop"] });
      void queryClient.invalidateQueries({ queryKey: submissionsQueryKey });
      window.dispatchEvent(new Event("profile-updated"));
      window.dispatchEvent(new Event("rewards-updated"));

      if (payload.bonusAwarded && (payload.bonusPoints || 0) > 0) {
        toast.success(
          locale === "ro"
            ? `Daily challenge rezolvat! Ai primit ${payload.bonusPoints} puncte bonus.`
            : `Daily challenge solved! You received ${payload.bonusPoints} bonus points.`
        );
      }
    } catch (error) {
      setEvaluationStatuses(
        problem.test_cases.map(() => ({ status: "failed" }))
      );
      const message = error instanceof Error ? error.message : "Submission failed";
      setResult(`${t("problemPage.result.error")}: ${message}`);
      toast.error(message);
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

  if (!id || loading) {
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
            onValueChange={(v) =>
              setActiveTab(v as "description" | "solution" | "submissions")
            }
            className="flex h-full min-h-0 flex-col gap-0"
          >
            <TabsList className="grid h-11 w-full grid-cols-3 rounded-none border-b bg-zinc-50 px-3">
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
              <TabsTrigger value="submissions" className="text-sm">
                {locale === "ro" ? "Submisii" : "Submissions"}
                {(submissionsQuery.data?.submissions.length || 0) > 0 && (
                  <span className="ml-2 text-xs text-zinc-500">
                    {submissionsQuery.data?.submissions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-0 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-5 py-5">
                <h2 className="text-xl font-bold tracking-tight">
                  {localizedTitle}
                </h2>
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

            <TabsContent value="submissions" className="mt-0 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-5 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {locale === "ro" ? "Istoricul submisiilor" : "Submission history"}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {locale === "ro"
                      ? "Poți deschide orice încercare pentru a vedea și copia codul trimis."
                      : "Open any attempt to inspect and copy the submitted code."}
                  </p>
                </div>
                {submissionsQuery.isPending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : submissionsQuery.isError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {locale === "ro"
                      ? "Nu am putut încărca submisiile."
                      : "Could not load submissions."}
                  </div>
                ) : (
                  <SubmissionHistory
                    locale={locale}
                    items={(submissionsQuery.data?.submissions || []).map((submission) => ({
                      code: submission.code,
                      id: submission.id,
                      score: submission.score,
                      submittedAt: submission.created_at,
                    }))}
                  />
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
