"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  RotateCcw,
  Search,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { RouteLoadingSkeleton } from "@/components/loading/RouteLoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api, type DailyChallenge } from "@/lib/api";
import { getLocalized } from "@/lib/getLocalized";
import { markdownPreview } from "@/lib/markdownPreview";
import { supabase } from "@/lib/supabase";

type Difficulty = "easy" | "medium" | "hard";
type DifficultyFilter = "all" | Difficulty;
type ProgressFilter = "all" | "notStarted" | "inProgress" | "solved";
type SortMode = "code" | "difficulty" | "progress";

type ProblemRow = {
  code: number | null;
  description_i18n: Record<string, string> | null;
  difficulty: Difficulty;
  id: string;
  title_i18n: Record<string, string> | null;
};

type ProblemsData = {
  dailyChallenge: DailyChallenge | null;
  dailySolved: boolean;
  problems: ProblemRow[];
  progress: Record<string, number>;
};

const difficulties: DifficultyFilter[] = ["all", "easy", "medium", "hard"];
const difficultyRank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function getProblemStatus(score: number | undefined): ProgressFilter {
  if (score === 100) return "solved";
  if (typeof score === "number" && score > 0) return "inProgress";
  return "notStarted";
}

function difficultyDot(difficulty: Difficulty) {
  if (difficulty === "easy") return "bg-[var(--sx-success)]";
  if (difficulty === "medium") return "bg-[var(--sx-warning)]";
  return "bg-destructive";
}

export default function ProblemsPage() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("code");

  const fetchProblemsData = async (): Promise<ProblemsData> => {
    const [problemResult, dailyChallenge, submissionResult] = await Promise.all([
      supabase
        .from("problems")
        .select("id, code, title_i18n, description_i18n, difficulty")
        .order("code", { ascending: true }),
      api.dailyChallenges.getForDate(),
      user
        ? supabase
            .from("submissions")
            .select("problem_id, score")
            .eq("user_id", user.id)
        : Promise.resolve({
            data: [] as Array<{ problem_id: string; score: number }>,
            error: null,
          }),
    ]);

    if (problemResult.error) throw problemResult.error;
    if (submissionResult.error) throw submissionResult.error;

    const progress: Record<string, number> = {};
    for (const submission of submissionResult.data ?? []) {
      progress[submission.problem_id] = Math.max(
        progress[submission.problem_id] ?? 0,
        submission.score ?? 0
      );
    }

    const dailyCompletion = dailyChallenge && user
      ? await api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
      : null;

    return {
      dailyChallenge,
      dailySolved: Boolean(dailyCompletion),
      problems: (problemResult.data ?? []) as ProblemRow[],
      progress,
    };
  };

  const problemsQuery = useQuery<ProblemsData>({
    queryKey: ["problems", user?.id ?? "guest"],
    queryFn: fetchProblemsData,
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const problems = useMemo(() => problemsQuery.data?.problems ?? [], [problemsQuery.data]);
  const progress = useMemo(() => problemsQuery.data?.progress ?? {}, [problemsQuery.data]);
  const dailyChallenge = problemsQuery.data?.dailyChallenge ?? null;
  const dailySolved = problemsQuery.data?.dailySolved ?? false;

  const summary = useMemo(() => {
    let solved = 0;
    let inProgress = 0;
    for (const problem of problems) {
      const status = getProblemStatus(progress[problem.id]);
      if (status === "solved") solved += 1;
      if (status === "inProgress") inProgress += 1;
    }
    return {
      completion: problems.length ? Math.round((solved / problems.length) * 100) : 0,
      inProgress,
      solved,
      total: problems.length,
    };
  }, [problems, progress]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<DifficultyFilter, number> = {
      all: problems.length,
      easy: 0,
      medium: 0,
      hard: 0,
    };
    for (const problem of problems) counts[problem.difficulty] += 1;
    return counts;
  }, [problems]);

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const codeQuery = query.replace(/^#/, "");

    return problems
      .filter((problem) => {
        if (difficulty !== "all" && problem.difficulty !== difficulty) return false;
        if (
          progressFilter !== "all" &&
          getProblemStatus(progress[problem.id]) !== progressFilter
        ) return false;
        if (!query) return true;
        if (/^\d+$/.test(codeQuery) && String(problem.code ?? "") === codeQuery) return true;
        return (
          getLocalized(problem.title_i18n, locale).toLowerCase().includes(query) ||
          getLocalized(problem.description_i18n, locale).toLowerCase().includes(query)
        );
      })
      .sort((first, second) => {
        if (sort === "difficulty") {
          return difficultyRank[first.difficulty] - difficultyRank[second.difficulty];
        }
        if (sort === "progress") {
          return (progress[second.id] ?? 0) - (progress[first.id] ?? 0);
        }
        return (first.code ?? Number.MAX_SAFE_INTEGER) - (second.code ?? Number.MAX_SAFE_INTEGER);
      });
  }, [difficulty, locale, problems, progress, progressFilter, search, sort]);

  const continueProblem = useMemo(
    () =>
      problems.find((problem) => getProblemStatus(progress[problem.id]) === "inProgress") ??
      problems.find((problem) => getProblemStatus(progress[problem.id]) === "notStarted"),
    [problems, progress]
  );

  const resetFilters = () => {
    setDifficulty("all");
    setProgressFilter("all");
    setSearch("");
    setSort("code");
  };

  if (problemsQuery.isPending) return <RouteLoadingSkeleton variant="problems" />;

  if (problemsQuery.isError) {
    return (
      <div className="sx-surface grid min-h-[360px] place-items-center px-6">
        <EmptyState
          icon={<CircleDashed className="size-6" />}
          title={t("problems.error.title")}
          description={t("problems.error.description")}
          action={
            <Button onClick={() => void problemsQuery.refetch()}>
              <RotateCcw data-icon="inline-start" />
              {t("problems.error.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title={<span data-tour="problems-workspace">{t("problems.title")}</span>}
        subtitle={t("problems.subtitle")}
        action={
          user && continueProblem ? (
            <Button asChild>
              <Link href={`/problems/${continueProblem.id}`}>
                {t("problems.actions.continue")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null
        }
      />

      <section aria-label={t("problems.stats.label")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("problems.stats.total"), summary.total],
          [t("problems.stats.solved"), summary.solved],
          [t("problems.stats.inProgress"), summary.inProgress],
          [t("problems.stats.completion"), `${summary.completion}%`],
        ].map(([label, value]) => (
          <div key={label} className="sx-surface px-4 py-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {dailyChallenge?.problems && (
        <section className="sx-surface overflow-hidden" aria-labelledby="daily-challenge-title">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--sx-radius-control)] bg-[var(--sx-warning-soft)] text-[var(--sx-warning)]">
                <CalendarDays className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="daily-challenge-title" className="font-semibold">
                    {t("problems.daily.title")}
                  </h2>
                  {dailySolved && (
                    <Badge variant="outline" className="text-[var(--sx-success)]">
                      <CheckCircle2 aria-hidden="true" />
                      {t("problems.status.solved")}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    +{dailyChallenge.bonus_points ?? 0} {t("problems.daily.points")}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-semibold">
                  {dailyChallenge.problems.code != null && (
                    <span className="mr-2 font-mono text-sm font-medium text-muted-foreground">
                      #{dailyChallenge.problems.code}
                    </span>
                  )}
                  {getLocalized(dailyChallenge.problems.title_i18n, locale)}
                </p>
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {markdownPreview(getLocalized(dailyChallenge.problems.description_i18n, locale))}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="self-start sm:self-center">
              <Link href={`/problems/${dailyChallenge.problem_id}`}>
                {t("problems.daily.open")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="problem-library-title" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="problem-library-title" className="text-xl font-semibold">
              {t("problems.library.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("problems.library.description")}
            </p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {filteredProblems.length} {t(filteredProblems.length === 1 ? "problems.library.result" : "problems.library.results")}
          </p>
        </div>

        <div className="sx-surface space-y-3 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label={t("problems.searchPlaceholder")}
              className="h-9 pl-9"
              placeholder={t("problems.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1" role="group" aria-label={t("problems.filters.label")}>
              {difficulties.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={difficulty === item ? "secondary" : "ghost"}
                  aria-pressed={difficulty === item}
                  onClick={() => setDifficulty(item)}
                >
                  {t(`problems.filters.${item}`)}
                  <span className="ml-1 text-muted-foreground tabular-nums">{difficultyCounts[item]}</span>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={progressFilter} onValueChange={(value) => setProgressFilter(value as ProgressFilter)}>
                <SelectTrigger className="min-w-36" aria-label={t("problems.progressFilter.label")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(["all", "notStarted", "inProgress", "solved"] as ProgressFilter[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`problems.progressFilter.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
                <SelectTrigger className="min-w-36" aria-label={t("problems.sort.label")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(["code", "difficulty", "progress"] as SortMode[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`problems.sort.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredProblems.length ? (
          <div className="sx-surface divide-y divide-border overflow-hidden">
            {filteredProblems.map((problem) => {
              const score = progress[problem.id];
              const status = getProblemStatus(score);
              const title = getLocalized(problem.title_i18n, locale);
              const description = markdownPreview(getLocalized(problem.description_i18n, locale));

              return (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.id}`}
                  className="sx-interactive group grid gap-4 px-4 py-4 outline-none hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 gap-4">
                    <span className="mt-0.5 w-10 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                      {problem.code != null ? `#${problem.code}` : "—"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold group-hover:underline group-hover:underline-offset-4">
                        {title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pl-14 sm:min-w-72 sm:justify-end sm:pl-0">
                    <Badge variant="outline">
                      <span className={`size-1.5 rounded-full ${difficultyDot(problem.difficulty)}`} aria-hidden="true" />
                      {t(`problems.filters.${problem.difficulty}`)}
                    </Badge>

                    <div className="w-28">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className={status === "solved" ? "text-[var(--sx-success)]" : "text-muted-foreground"}>
                          {t(`problems.status.${status}`)}
                        </span>
                        {status !== "notStarted" && <span className="font-medium tabular-nums">{score}%</span>}
                      </div>
                      <Progress
                        value={score ?? 0}
                        aria-label={`${title}: ${score ?? 0}%`}
                        className={status === "solved" ? "[&_[data-slot=progress-indicator]]:bg-[var(--sx-success)]" : ""}
                      />
                    </div>

                    <ArrowRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="sx-surface">
            <EmptyState
              icon={<Search className="size-6" />}
              title={t("problems.empty.title")}
              description={t("problems.empty.description")}
              action={
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw data-icon="inline-start" />
                  {t("problems.empty.reset")}
                </Button>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}
