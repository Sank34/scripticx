"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { WorkspaceAccessGuard } from "@/components/workspaces/WorkspaceAccessGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowUpRight,
} from "lucide-react";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";
import { api, type DailyChallenge } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteLoadingSkeleton } from "@/components/loading/RouteLoadingSkeleton";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/DashboardCharts").then(
      (module) => module.DashboardCharts
    ),
  {
    ssr: false,
    loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-muted" />,
  }
);

type DashboardStats = {
  solved: number;
  total: number;
  average: number;
};

type DashboardData = {
  stats: DashboardStats;
  recent: any[];
  leaderboard: any[];
  feed: any[];
  dailyChallenge: DailyChallenge | null;
  dailySolved: boolean;
};

function DashboardContent() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();

  async function fetchDashboardData(): Promise<DashboardData> {
    if (!user) {
      return {
        stats: {
          solved: 0,
          total: 0,
          average: 0,
        },
        recent: [],
        leaderboard: [],
        feed: [],
        dailyChallenge: null,
        dailySolved: false,
      };
    }

    const [
      { data: submissions },
      dailyChallenge,
      { data: users },
      { data: following },
    ] = await Promise.all([
      supabase
        .from("submissions")
        .select(`
          id,
          user_id,
          problem_id,
          score,
          created_at,
          problems (
            title_i18n
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      api.dailyChallenges.getForDate(),
      supabase
        .from("profiles")
        .select("id, username, avatar_url, total_score, equipped_rewards")
        .order("total_score", { ascending: false })
        .limit(5),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
    ]);

    const data = submissions || [];

    const best: Record<string, number> = {};

    for (const sub of data) {
      const current = best[sub.problem_id];
      if (!current || sub.score > current) {
        best[sub.problem_id] = sub.score;
      }
    }

    const scores = Object.values(best);

    const solved = scores.filter((s) => s === 100).length;
    const total = Object.keys(best).length;
    const average =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const stats = {
      solved,
      total,
      average,
    };

    const recent = data.slice(0, 5);

    const leaderboard = users || [];
    const ids = following?.map((f: any) => f.following_id) || [];

    const [{ data: feedData }, dailyCompletion] = await Promise.all([
      ids.length
        ? supabase
            .from("submissions")
            .select(`
              score,
              created_at,
              user_id,
              problem_id,
              problems (title_i18n)
            `)
            .in("user_id", ids)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as any[], error: null }),
      dailyChallenge
        ? api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
        : Promise.resolve(null),
    ]);

    let feed: any[] = [];
    if (feedData?.length) {
      const userIds = [...new Set(feedData.map((item: any) => item.user_id))];
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, equipped_rewards")
        .in("id", userIds);
      const userMap = Object.fromEntries(
        (usersData || []).map((profile: any) => [profile.id, profile])
      );
      feed = feedData.map((item: any) => ({
        ...item,
        profile: userMap[item.user_id],
      }));
    }

    return {
      stats,
      recent,
      leaderboard,
      feed,
      dailyChallenge,
      dailySolved: Boolean(dailyCompletion),
    };
  }

  const {
    data: dashboardData,
    isLoading: loading,
  } = useQuery<DashboardData>({
    queryKey: ["dashboard", user?.id, locale],
    queryFn: fetchDashboardData,
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  });

  const stats = dashboardData?.stats || {
    solved: 0,
    total: 0,
    average: 0,
  };

  const recent = dashboardData?.recent || [];
  const leaderboard = dashboardData?.leaderboard || [];
  const feed = dashboardData?.feed || [];
  const dailyChallenge = dashboardData?.dailyChallenge || null;
  const dailySolved = dashboardData?.dailySolved || false;
  const scoreTrend = recent
    .slice()
    .reverse()
    .map((item, index) => ({
      name: `${index + 1}`,
      score: Number(item.score) || 0,
    }));
  const scoreDistribution = [
    {
      name: locale === "ro" ? "Perfecte" : "Perfect",
      value: recent.filter((item) => Number(item.score) === 100).length,
      color: "#10b981",
    },
    {
      name: locale === "ro" ? "Parțiale" : "Partial",
      value: recent.filter(
        (item) => Number(item.score) > 0 && Number(item.score) < 100
      ).length,
      color: "#f97316",
    },
    {
      name: locale === "ro" ? "De revăzut" : "Needs work",
      value: recent.filter((item) => Number(item.score) === 0).length,
      color: "#ef4444",
    },
  ];
  const topUser = leaderboard[0];

  if (loading || !user) {
    return <RouteLoadingSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" data-tour="dashboard-overview">
        <Card className="overflow-hidden border-border bg-card shadow-none">
          <CardContent className="flex min-h-56 flex-col justify-between gap-8 p-6 sm:p-8">
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                {locale === "ro" ? "Workspace personal" : "Personal workspace"}
              </p>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {t("dashboard.title")}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {locale === "ro"
                  ? "Urmărește progresul, revino la provocarea zilei și vezi cum evoluează rezolvările tale."
                  : "Track progress, jump back into today's challenge and see how your submissions evolve."}
              </p>
            </div>
            <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x">
              {[
                {
                  label: t("dashboard.stats.solved"),
                  value: stats.solved,
                },
                {
                  label: t("dashboard.stats.score"),
                  value: stats.total,
                },
                {
                  label: t("dashboard.stats.streak"),
                  value: `${stats.average}%`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border-b border-border p-4 last:border-b-0 sm:border-b-0"
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none" data-tour="dashboard-daily-challenge">
          <CardHeader>
            <CardTitle>
              {locale === "ro" ? "Challenge-ul zilei" : "Daily challenge"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {dailyChallenge?.problems ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {dailySolved
                      ? t("problems.status.solved")
                      : locale === "ro"
                      ? "Pregătit de rezolvat"
                      : "Ready to solve"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {dailyChallenge.problems.code != null && (
                      <span className="mr-2 font-mono text-muted-foreground">
                        #{dailyChallenge.problems.code}
                      </span>
                    )}
                    {getLocalized(dailyChallenge.problems.title_i18n, locale)}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {locale === "ro"
                      ? "Un exercițiu zilnic pentru streak, focus și puncte bonus."
                      : "A daily exercise for streaks, focus and bonus points."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    +{dailyChallenge.bonus_points || 0} pts
                  </Badge>
                  <Badge>
                    {t(`problems.filters.${dailyChallenge.problems.difficulty}`)}
                  </Badge>
                  {dailySolved ? (
                    <Button size="sm" disabled>
                      {t("problems.status.solved")}
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <a href={`/problems/${dailyChallenge.problem_id}`}>
                        {locale === "ro" ? "Rezolvă" : "Solve"}
                      </a>
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <EmptyState className="py-4" title={t("dashboard.states.empty")} />
            )}
          </CardContent>
        </Card>
      </section>

      <DashboardCharts
        scoreDistribution={scoreDistribution}
        scoreTrend={scoreTrend}
      />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title={t("dashboard.leaderboard.title")}
          action={
            <a
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("dashboard.leaderboard.viewAll")}
              <ArrowUpRight className="size-3.5" />
            </a>
          }
          contentClassName="space-y-3"
        >
          {leaderboard.length === 0 && (
            <EmptyState
              className="py-4"
              title={t("dashboard.leaderboard.emptyTitle")}
              description={t("dashboard.leaderboard.emptyDescription")}
            />
          )}

          {topUser && (
            <div className="mb-2 rounded-2xl border border-amber-200/70 bg-amber-50 p-4 text-zinc-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-foreground">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={topUser.avatar_url}
                  equippedRewards={topUser.equipped_rewards}
                  className="size-10"
                  username={topUser.username}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-200/80">
                    {t("dashboard.leaderboard.leader")}
                  </p>
                  <p className="truncate font-semibold">{topUser.username}</p>
                  <p className="text-xs text-zinc-600 dark:text-amber-100/70">
                    {topUser.total_score || 0} {t("leaderboard.points")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {leaderboard.slice(1, 5).map((u, i) => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-7 text-sm font-medium text-muted-foreground">
                  #{i + 2}
                </span>
                <UserAvatar
                  avatarUrl={u.avatar_url}
                  equippedRewards={u.equipped_rewards}
                  className="size-7"
                  username={u.username}
                />
                <span className="truncate text-sm font-medium">{u.username}</span>
              </div>
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                {u.total_score || 0}
              </span>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title={t("dashboard.sections.recent")}
          contentClassName="space-y-3"
        >
          {recent.length === 0 && (
            <EmptyState
              className="py-4"
              title={t("dashboard.states.noSubmissionsTitle")}
              description={t("dashboard.states.noSubmissionsDescription")}
            />
          )}

          {recent.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {getLocalized(r.problems?.title_i18n, locale) ||
                    t("dashboard.states.unknownProblem")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString(
                    locale === "ro" ? "ro-RO" : "en-US"
                  )}
                </p>
              </div>
              <Badge
                variant={
                  r.score === 100
                    ? "default"
                    : r.score >= 50
                    ? "secondary"
                    : "destructive"
                }
              >
                {r.score}%
              </Badge>
            </div>
          ))}
        </SectionCard>
      </section>

      <SectionCard
        title={t("dashboard.sections.activity")}
        contentClassName="space-y-3"
      >
        {feed.length === 0 && (
          <EmptyState
            className="py-4"
            title={t("dashboard.states.quietFeedTitle")}
            description={t("dashboard.states.quietFeedDescription")}
          />
        )}

        {feed.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <a
                href={`/u/${item.profile?.username}`}
                className="flex min-w-0 items-center gap-3 transition hover:opacity-80"
              >
                <UserAvatar
                  avatarUrl={item.profile?.avatar_url}
                  equippedRewards={item.profile?.equipped_rewards}
                  className="size-8"
                  username={item.profile?.username}
                />
                <span className="truncate text-sm font-medium">
                  {item.profile?.username}
                </span>
              </a>
              <span className="text-sm text-muted-foreground">
                {t("dashboard.activity.solved")}
              </span>
              <a
                href={`/problems/${item.problem_id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {getLocalized(item.problems?.title_i18n, locale)}
              </a>
            </div>
            <Badge className="w-fit">{item.score}%</Badge>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RouteGuard requireAuth>
      <WorkspaceAccessGuard kind="personal">
        <DashboardContent />
      </WorkspaceAccessGuard>
    </RouteGuard>
  );
}
