"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import { markdownPreview } from "@/lib/markdownPreview";
import { api, type DailyChallenge } from "@/lib/api";
import { CalendarDays } from "lucide-react";

type ProblemsData = {
  problems: any[];
  progress: Record<string, number>;
  dailyChallenge: DailyChallenge | null;
  dailySolved: boolean;
};

export default function ProblemsPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [filter, setFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");

  const [search, setSearch] = useState("");

  async function fetchProblemsData(): Promise<ProblemsData> {
    const { data: problemsData } = await supabase
      .from("problems")
      .select("*")
      .order("code", { ascending: true });

    const problems = problemsData || [];

    if (!user) {
      return {
        problems,
        progress: {},
        dailyChallenge: await api.dailyChallenges.getForDate(),
        dailySolved: false,
      };
    }

    const [{ data: submissions }, dailyChallenge] = await Promise.all([
      supabase
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id),
      api.dailyChallenges.getForDate(),
    ]);

    const bestScores: Record<string, number> = {};

    submissions?.forEach((sub) => {
      if (
        !bestScores[sub.problem_id] ||
        sub.score > bestScores[sub.problem_id]
      ) {
        bestScores[sub.problem_id] = sub.score;
      }
    });

    const dailyCompletion = dailyChallenge
      ? await api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
      : null;

    return {
      problems,
      progress: bestScores,
      dailyChallenge,
      dailySolved: Boolean(dailyCompletion),
    };
  }

  const {
    data: problemsData,
    isLoading: loading,
  } = useQuery<ProblemsData>({
    queryKey: ["problems", user?.id],
    queryFn: fetchProblemsData,
  });

  const problems = problemsData?.problems || [];
  const progress = problemsData?.progress || {};
  const dailyChallenge = problemsData?.dailyChallenge || null;
  const dailySolved = problemsData?.dailySolved || false;

  const filteredProblems = problems.filter((p) => {
    if (filter !== "all" && p.difficulty !== filter) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    const codeQuery = q.replace(/^#/, "");
    if (/^\d+$/.test(codeQuery) && String(p.code ?? "") === codeQuery) {
      return true;
    }

    return (
      getLocalized(p.title_i18n, locale).toLowerCase().includes(q) ||
      getLocalized(p.description_i18n, locale).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">

      <h1 data-tour="problems-workspace" className="text-3xl font-bold">{t("problems.title")}</h1>

      {dailyChallenge?.problems && (
        <Link href={`/problems/${dailyChallenge.problem_id}`} className="block">
          <Card className="border-orange-200 bg-orange-50/60 transition hover:shadow-md dark:border-orange-900 dark:bg-orange-950/30">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                  <CalendarDays className="h-4 w-4" />
                  {locale === "ro" ? "Challenge-ul zilei" : "Daily challenge"}
                </div>
                <h2 className="truncate text-lg font-semibold">
                  {dailyChallenge.problems.code != null && (
                    <span className="mr-2 font-mono text-muted-foreground">
                      #{dailyChallenge.problems.code}
                    </span>
                  )}
                  {getLocalized(dailyChallenge.problems.title_i18n, locale)}
                </h2>
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {markdownPreview(
                    getLocalized(dailyChallenge.problems.description_i18n, locale)
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {dailySolved && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    {t("problems.status.solved")}
                  </Badge>
                )}
                <Badge variant="secondary">
                  +{dailyChallenge.bonus_points || 0} pts
                </Badge>
                <Badge>
                  {t(`problems.filters.${dailyChallenge.problems.difficulty}`)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="pt-1">
        <Input
          placeholder={t("problems.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {["all", "easy", "medium", "hard"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f as any)}
          >
            {t(`problems.filters.${f}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">

        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}

        {!loading &&
          filteredProblems.map((p) => {
            const score = progress[p.id];

            return (
              <Link key={p.id} href={`/problems/${p.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer">
                  <CardContent className="p-4 flex justify-between items-center">

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">
                        {p.code != null && (
                          <span className="mr-2 text-muted-foreground font-mono">
                            #{p.code}
                          </span>
                        )}
                        {getLocalized(p.title_i18n, locale)}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {markdownPreview(getLocalized(p.description_i18n, locale))}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center">

                      <span className="text-sm font-medium">
                        {score === 100
                          ? t("problems.status.solved")
                          : score
                          ? `${score}%`
                          : t("problems.status.notStarted")}
                      </span>

                      <Badge
                        variant={
                          p.difficulty === "easy"
                            ? "secondary"
                            : p.difficulty === "medium"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {t(`problems.filters.${p.difficulty}`)}
                      </Badge>

                    </div>

                  </CardContent>
                </Card>
              </Link>
            );
          })}

      </div>
    </div>
  );
}
