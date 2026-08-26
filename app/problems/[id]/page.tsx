"use client";

import { useEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Beaker,
  CheckCircle2,
  Code2,
  FileText,
  History,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import RouteGuard from "@/components/RouteGuard";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { SubmissionHistory } from "@/components/problems/SubmissionHistory";
import {
  TestResultCard,
  type ProblemTestResult,
} from "@/components/problems/TestResultCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { api, type DailyChallenge } from "@/lib/api";
import { competitionApiFetch } from "@/lib/competitionClient";
import type { StandardSubmission } from "@/lib/competitionTypes";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";

type EvaluationStatus = {
  status: "pending" | "evaluating" | "passed" | "failed";
};

type ProblemPanel = "description" | "solution" | "submissions";

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

function ProblemWorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,66%)_1px_minmax(280px,34%)]">
          <div className="flex min-h-0 flex-col">
            <Skeleton className="h-9 w-full rounded-none" />
            <Skeleton className="min-h-0 flex-1 rounded-none" />
            <Skeleton className="h-7 w-full rounded-none" />
          </div>
          <div className="hidden bg-border md:block" />
          <div className="hidden min-h-0 md:flex">
            <div className="w-12 shrink-0 space-y-2 border-r p-2">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <div className="min-w-0 flex-1 space-y-4 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemContent() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { locale, t } = useLanguage();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [activePanel, setActivePanel] = useState<ProblemPanel>("description");
  const [code, setCode] = useState("");
  const [compactLayout, setCompactLayout] = useState(false);
  const [editorLine, setEditorLine] = useState(1);
  const [evaluationStatuses, setEvaluationStatuses] = useState<EvaluationStatus[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setResult] = useState<string | null>(null);
  const [tabSize, setTabSize] = useState(2);
  const [testResults, setTestResults] = useState<ProblemTestResult[]>([]);
  const hydratedProblemId = useRef<string | null>(null);

  const problemQueryKey = ["problems", "detail", id, user?.id] as const;
  const problemQuery = useQuery({
    queryKey: problemQueryKey,
    queryFn: async (): Promise<ProblemPageData> => {
      const [problemResult, todayChallenge] = await Promise.all([
        supabase.from("problems").select("*").eq("id", id).maybeSingle(),
        api.dailyChallenges.getForDate(),
      ]);
      if (problemResult.error) throw problemResult.error;

      const dailyChallenge = todayChallenge?.problem_id === id ? todayChallenge : null;
      const completion = dailyChallenge && user
        ? await api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
        : null;

      return {
        problem: problemResult.data,
        dailyChallenge,
        dailyCompleted: Boolean(completion),
      };
    },
    enabled: Boolean(id) && !authLoading,
    staleTime: 2 * 60 * 1000,
  });

  const problem = problemQuery.data?.problem ?? null;
  const dailyChallenge = problemQuery.data?.dailyChallenge ?? null;
  const dailyCompleted = problemQuery.data?.dailyCompleted ?? false;
  const submissionsQueryKey = ["problems", "submissions", id, user?.id] as const;
  const submissionsQuery = useQuery<{ submissions: StandardSubmission[] }>({
    queryKey: submissionsQueryKey,
    queryFn: () => competitionApiFetch(`/api/submissions?problemId=${encodeURIComponent(id)}`),
    enabled: Boolean(id && user?.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const synchronize = () => setCompactLayout(media.matches);
    synchronize();
    media.addEventListener("change", synchronize);
    return () => media.removeEventListener("change", synchronize);
  }, []);

  useEffect(() => {
    if (!problem || hydratedProblemId.current === id) return;
    setCode(problem.starter_code || "");
    hydratedProblemId.current = id;
  }, [id, problem]);

  async function runCode() {
    if (!problem || !user) return;

    const testCaseCount = Array.isArray(problem.test_cases) ? problem.test_cases.length : 0;
    setIsSubmitting(true);
    setActivePanel("solution");
    setTestResults([]);
    setEvaluationStatuses(
      Array.from({ length: testCaseCount }, () => ({ status: "pending" as const }))
    );

    try {
      setEvaluationStatuses(
        Array.from({ length: testCaseCount }, () => ({ status: "evaluating" as const }))
      );
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw sessionError || new Error("Authentication required");
      }

      const response = await fetch("/api/submissions/evaluate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problemId: id, code }),
      });
      const payload = (await response.json()) as {
        bonusAwarded?: boolean;
        bonusPoints?: number;
        error?: string;
        results?: ProblemTestResult[];
        score?: number;
      };
      if (!response.ok || typeof payload.score !== "number" || !payload.results) {
        throw new Error(payload.error || "Could not evaluate submission");
      }

      setResult(`${t("problemPage.result.score")}: ${payload.score}%`);
      setTestResults(payload.results);
      setEvaluationStatuses(
        payload.results.map((result) => ({ status: result.passed ? "passed" : "failed" }))
      );

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

      if (payload.bonusAwarded && (payload.bonusPoints ?? 0) > 0) {
        toast.success(
          locale === "ro"
            ? `Provocare rezolvată. Ai primit ${payload.bonusPoints} puncte bonus.`
            : `Challenge solved. You received ${payload.bonusPoints} bonus points.`
        );
      }
    } catch (error) {
      setEvaluationStatuses(
        Array.from({ length: testCaseCount }, () => ({ status: "failed" as const }))
      );
      const message = error instanceof Error ? error.message : "Submission failed";
      setResult(`${t("problemPage.result.error")}: ${message}`);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEditorMount: OnMount = (editor) => {
    const synchronizeLine = () => setEditorLine(editor.getPosition()?.lineNumber ?? 1);
    synchronizeLine();
    editor.onDidChangeCursorPosition(synchronizeLine);
    editor.onDidFocusEditorText(synchronizeLine);
    editor.onDidChangeModelContent(synchronizeLine);
  };

  if (!id || problemQuery.isPending) return <ProblemWorkspaceSkeleton />;

  if (!problem || problemQuery.isError) {
    return (
      <div className="grid h-full place-items-center p-6">
        <EmptyState
          icon={<FileText className="size-6" />}
          title={t("problemPage.notFound")}
          action={
            <Button asChild variant="outline">
              <Link href="/problems">
                <ArrowLeft data-icon="inline-start" />
                {t("problemPage.actions.back")}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const passedCount = testResults.filter((result) => result.passed).length;
  const score = testResults.length
    ? Math.round((passedCount / testResults.length) * 100)
    : 0;
  const localizedTitle = getLocalized(problem.title_i18n, locale);
  const fileName = `${slugify(
    getLocalized(problem.title_i18n, "en") || localizedTitle
  )}.msp`;
  const perfectScore = testResults.length > 0 && passedCount === testResults.length;
  const panelItems = [
    {
      id: "description" as const,
      icon: FileText,
      label: t("problemPage.tabs.description"),
    },
    {
      id: "solution" as const,
      icon: Beaker,
      label: t("problemPage.tabs.solution"),
    },
    {
      id: "submissions" as const,
      icon: History,
      label: t("problemPage.tabs.submissions"),
    },
  ];
  const activePanelItem = panelItems.find((item) => item.id === activePanel) ?? panelItems[0];
  const ActivePanelIcon = activePanelItem.icon;

  const tabSizeControl = (
    <Select value={String(tabSize)} onValueChange={(value) => setTabSize(Number(value))}>
      <SelectTrigger
        size="sm"
        className="h-6 border-0 bg-transparent px-1.5 text-[11px] text-muted-foreground shadow-none"
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

  const problemPanel = (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="hidden h-10 shrink-0 items-center justify-between border-b px-3 md:flex">
        <div className="flex min-w-0 items-center gap-2">
          <ActivePanelIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-xs font-semibold">{activePanelItem.label}</span>
        </div>
        {activePanel === "solution" && testResults.length > 0 && (
          <span className={perfectScore ? "text-xs font-semibold text-[var(--sx-success)]" : "text-xs font-semibold text-destructive"}>
            {score}%
          </span>
        )}
      </div>

      <nav className="grid h-10 shrink-0 grid-cols-3 border-b bg-muted/25 p-1 md:hidden" aria-label={t("problemPage.panelNavigation")}>
        {panelItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              aria-pressed={activePanel === item.id}
              className={`flex items-center justify-center gap-1.5 rounded-[var(--sx-radius-control)] text-xs font-medium transition-colors ${
                activePanel === item.id
                  ? "border border-border bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activePanel === "description" && (
          <div className="space-y-5 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {problem.code != null && (
                  <span className="font-mono text-xs text-muted-foreground">#{problem.code}</span>
                )}
                <Badge variant="outline">{t(`problems.filters.${problem.difficulty}`)}</Badge>
                {dailyChallenge && (
                  <Badge variant="secondary">
                    {t("problems.daily.title")} · +{dailyChallenge.bonus_points ?? 0} {t("problems.daily.points")}
                  </Badge>
                )}
                {dailyCompleted && (
                  <Badge variant="outline" className="text-[var(--sx-success)]">
                    <CheckCircle2 aria-hidden="true" />
                    {t("problems.status.solved")}
                  </Badge>
                )}
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{localizedTitle}</h2>
            </div>
            <div className="text-sm leading-7 text-foreground/90">
              <Markdown>{getLocalized(problem.description_i18n, locale)}</Markdown>
            </div>
          </div>
        )}

        {activePanel === "solution" && (
          <div className="space-y-5 p-5">
            {isSubmitting ? (
              <>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("problemPage.evaluation.title")}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("problemPage.evaluation.subtitle")}
                  </p>
                </div>
                <div className="divide-y overflow-hidden rounded-[var(--sx-radius-card)] border">
                  {evaluationStatuses.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="font-medium">
                        {t("problemPage.evaluation.testCase")} {index + 1}/{evaluationStatuses.length}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        item.status === "passed"
                          ? "text-[var(--sx-success)]"
                          : item.status === "failed"
                            ? "text-destructive"
                            : item.status === "evaluating"
                              ? "text-[var(--sx-warning)]"
                              : "text-muted-foreground"
                      }`}>
                        {item.status === "evaluating" && <Loader2 className="size-3.5 animate-spin" />}
                        {item.status === "passed" && <CheckCircle2 className="size-3.5" />}
                        {item.status === "failed" && <XCircle className="size-3.5" />}
                        {t(`problemPage.evaluation.${item.status}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : testResults.length > 0 ? (
              <>
                <div className="border-b pb-5">
                  <p className={`text-3xl font-semibold tabular-nums ${perfectScore ? "text-[var(--sx-success)]" : "text-destructive"}`}>
                    {score}%
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {perfectScore
                      ? t("problemPage.solution.successMessage")
                      : t("problemPage.solution.encouragement")}
                  </p>
                </div>
                <div className="space-y-3">
                  {testResults.map((testResult, index) => (
                    <TestResultCard
                      key={index}
                      index={index}
                      labels={{
                        correct: t("problemPage.tests.correct"),
                        programPrinted: t("problemPage.tests.programPrinted"),
                        programRead: t("problemPage.tests.programRead"),
                        shouldHavePrinted: t("problemPage.tests.shouldHavePrinted"),
                        test: t("problemPage.tests.test"),
                        wrong: t("problemPage.tests.wrong"),
                      }}
                      result={testResult}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                className="py-14"
                icon={<Beaker className="size-6" />}
                title={t("problemPage.solution.emptyTitle")}
                description={t("problemPage.solution.emptyDescription")}
                action={
                  <Button onClick={() => void runCode()}>
                    <Send data-icon="inline-start" />
                    {t("problemPage.actions.submit")}
                  </Button>
                }
              />
            )}
          </div>
        )}

        {activePanel === "submissions" && (
          <div className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">{t("problemPage.submissions.title")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("problemPage.submissions.description")}
              </p>
            </div>
            {submissionsQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : submissionsQuery.isError ? (
              <div className="rounded-[var(--sx-radius-card)] border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {t("problemPage.submissions.error")}
              </div>
            ) : (
              <SubmissionHistory
                locale={locale}
                emptyDescription={t("problemPage.submissions.empty")}
                items={(submissionsQuery.data?.submissions ?? []).map((submission) => ({
                  code: submission.code,
                  id: submission.id,
                  score: submission.score,
                  submittedAt: submission.created_at,
                }))}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );

  const inspectorPanel = (
    <div className="flex h-full min-h-0 min-w-0 bg-background">
      <nav
        className="hidden w-12 shrink-0 flex-col items-center gap-0.5 border-r bg-muted/20 py-1.5 md:flex"
        aria-label={t("problemPage.panelNavigation")}
      >
        {panelItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setActivePanel(item.id)}
                  aria-pressed={activePanel === item.id}
                  aria-label={item.label}
                  className={`relative grid size-10 place-items-center rounded-md transition-colors ${
                    activePanel === item.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {activePanel === item.id && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-foreground" />
                  )}
                  <Icon className="size-[18px]" />
                  {item.id === "solution" && testResults.length > 0 && (
                    <span
                      className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${
                        perfectScore ? "bg-[var(--sx-success)]" : "bg-destructive"
                      }`}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">{problemPanel}</div>
    </div>
  );

  const editorPanel = (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-background" aria-label={t("problemPage.editor.label")}>
      <div className="flex h-9 shrink-0 items-center border-b bg-muted/25">
        <div className="flex h-full min-w-0 items-center border-r border-t-2 border-t-foreground bg-background px-3 text-xs">
          <Code2 className="mr-2 size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-medium">{fileName}</span>
        </div>
      </div>
      <CodeEditorContextMenu
        code={code}
        fileName={fileName}
        onChange={setCode}
        onSubmit={runCode}
        submitDisabled={isSubmitting}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <MiniScriptMonacoEditor
            onMount={handleEditorMount}
            height="100%"
            language="msp"
            path={fileName}
            value={code}
            onChange={setCode}
            options={{
              acceptSuggestionOnEnter: "on",
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              contextmenu: false,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              fontLigatures: true,
              guides: { bracketPairs: true, indentation: true },
              inlineSuggest: { enabled: true },
              minimap: { enabled: !compactLayout, maxColumn: 90, scale: 0.8, showSlider: "mouseover" },
              padding: { top: 14, bottom: 20 },
              parameterHints: { enabled: true, cycle: true },
              quickSuggestions: { other: true, comments: false, strings: false },
              quickSuggestionsDelay: 60,
              scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
              snippetSuggestions: "top",
              stickyScroll: { enabled: true },
              suggestOnTriggerCharacters: true,
              tabSize,
              insertSpaces: true,
              wordBasedSuggestions: "currentDocument",
              wordWrap: "on",
              wrappingIndent: "same",
            }}
          />
        </div>
      </CodeEditorContextMenu>
      <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-muted/35 px-3 text-[11px] text-muted-foreground">
        <span>Ln {editorLine}</span>
        <div className="flex items-center gap-2">
          {tabSizeControl}
          <span>·</span>
          <span>MiniScript+</span>
        </div>
      </footer>
    </section>
  );

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="size-8 shrink-0 rounded-[var(--sx-radius-control)] bg-background shadow-xs"
                  asChild
                >
                  <Link href="/problems" aria-label={t("problemPage.actions.back")}>
                    <ArrowLeft />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("problemPage.actions.back")}</TooltipContent>
            </Tooltip>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5 text-sm">
                <span className="hidden font-medium text-muted-foreground sm:inline">ScripticX</span>
                <span className="hidden text-muted-foreground sm:inline">/</span>
                <h1 className="truncate font-semibold">
                  {problem.code != null && <span className="mr-1 text-muted-foreground">#{problem.code}</span>}
                  {localizedTitle}
                </h1>
              </div>
              <p className="hidden truncate text-[11px] text-muted-foreground md:block">{fileName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {t(`problems.filters.${problem.difficulty}`)}
            </Badge>
            {testResults.length > 0 && (
              <Badge variant={perfectScore ? "secondary" : "outline"} className="hidden md:inline-flex">
                {score}%
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => void runCode()}
              disabled={isSubmitting}
              className="h-8 px-3"
              aria-label={isSubmitting ? t("problemPage.actions.submitting") : t("problemPage.actions.submit")}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="hidden sm:inline">
                {isSubmitting ? t("problemPage.actions.submitting") : t("problemPage.actions.submit")}
              </span>
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <ResizablePanelGroup
            key={compactLayout ? "problem-compact" : "problem-desktop"}
            orientation={compactLayout ? "vertical" : "horizontal"}
            className="min-w-0 flex-1"
          >
            <ResizablePanel
              id="problem-editor"
              defaultSize={compactLayout ? "58%" : "66%"}
              minSize={compactLayout ? "280px" : "360px"}
            >
              {editorPanel}
            </ResizablePanel>
            <ResizableHandle
              aria-label={t("problemPage.resizePanel")}
              className={`z-20 bg-border transition-colors after:bg-transparent hover:bg-muted-foreground/50 focus-visible:bg-foreground/60 ${
                compactLayout
                  ? "h-px cursor-row-resize after:h-3"
                  : "w-px cursor-col-resize after:w-3"
              }`}
            />
            <ResizablePanel
              id="problem-inspector"
              defaultSize={compactLayout ? "42%" : "34%"}
              minSize={compactLayout ? "190px" : "280px"}
              maxSize={compactLayout ? "64%" : "52%"}
            >
              {inspectorPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function ProblemPage() {
  return (
    <RouteGuard requireAuth>
      <ProblemContent />
    </RouteGuard>
  );
}
