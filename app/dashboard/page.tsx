"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  Target,
  Trophy,
} from "lucide-react";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";
import { api, type DailyChallenge } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

    const [{ data }, dailyChallenge] = await Promise.all([
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
    ]);

    if (!data) {
      return {
        stats: {
          solved: 0,
          total: 0,
          average: 0,
        },
        recent: [],
        leaderboard: [],
        feed: [],
        dailyChallenge,
        dailySolved: false,
      };
    }

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

    const { data: users } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, total_score, equipped_rewards")
      .order("total_score", { ascending: false })
      .limit(5);

    const leaderboard = users || [];

    let feed: any[] = [];

    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const ids = following?.map((f: any) => f.following_id) || [];

    if (ids.length > 0) {
      const { data: feedData } = await supabase
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
        .limit(10);

      if (feedData) {
        const userIds = [...new Set(feedData.map((f: any) => f.user_id))];

        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, equipped_rewards")
          .in("id", userIds);

        const userMap = Object.fromEntries(
          (usersData || []).map((u: any) => [u.id, u])
        );

        feed = feedData.map((item: any) => ({
          ...item,
          profile: userMap[item.user_id],
        }));
      }
    }

    const dailyCompletion = dailyChallenge
      ? await api.dailyChallenges.getCompletion(dailyChallenge.id, user.id)
      : null;

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
  const hasScoreDistribution = scoreDistribution.some((item) => item.value > 0);
  const topUser = leaderboard[0];

  if (loading || !user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-60" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="relative overflow-hidden border-0 bg-zinc-950 text-white ring-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.35),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.25),transparent_30%)]" />
          <CardContent className="relative flex min-h-56 flex-col justify-between gap-8 p-6">
            <div>
              <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10">
                {locale === "ro" ? "Workspace personal" : "Personal workspace"}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {t("dashboard.title")}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/65 sm:text-base">
                {locale === "ro"
                  ? "Urmărește progresul, revino la provocarea zilei și vezi cum evoluează rezolvările tale."
                  : "Track progress, jump back into today's challenge and see how your submissions evolve."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: t("dashboard.stats.solved"),
                  value: stats.solved,
                  icon: CheckCircle2,
                },
                {
                  label: t("dashboard.stats.score"),
                  value: stats.total,
                  icon: Target,
                },
                {
                  label: t("dashboard.stats.streak"),
                  value: `${stats.average}%`,
                  icon: Flame,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-xs font-medium">{item.label}</span>
                    <item.icon className="size-4" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-orange-500" />
              {locale === "ro" ? "Challenge-ul zilei" : "Daily challenge"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {dailyChallenge?.problems ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
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

      <section className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-600" />
              {locale === "ro" ? "Evoluția scorurilor" : "Score trend"}
            </CardTitle>
            <Badge variant="secondary">
              {locale === "ro" ? "ultimele rezultate" : "latest results"}
            </Badge>
          </CardHeader>
          <CardContent>
            {scoreTrend.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreTrend}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState className="py-10" title={t("dashboard.states.empty")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-blue-600" />
              {locale === "ro" ? "Distribuția rezultatelor" : "Result mix"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[180px_1fr] xl:grid-cols-1">
            <div className="h-44">
              {hasScoreDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreDistribution}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                    >
                      {scoreDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState className="py-8" title={t("dashboard.states.empty")} />
              )}
            </div>
            <div className="space-y-2">
              {scoreDistribution.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          icon={<Trophy className="size-4 text-yellow-500" />}
          title={t("leaderboard.title")}
          action={
            <a
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("common.viewAll")}
              <ArrowUpRight className="size-3.5" />
            </a>
          }
          contentClassName="space-y-3"
        >
          {leaderboard.length === 0 && (
            <EmptyState className="py-4" title={t("dashboard.states.empty")} />
          )}

          {topUser && (
            <div className="mb-2 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={topUser.avatar_url}
                  equippedRewards={topUser.equipped_rewards}
                  className="size-10"
                  username={topUser.username}
                />
                <div>
                  <p className="font-semibold">{topUser.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {topUser.total_score || 0} pts
                  </p>
                </div>
              </div>
            </div>
          )}

          {leaderboard.slice(0, 5).map((u, i) => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 text-sm font-medium text-muted-foreground">
                  #{i + 1}
                </span>
                <UserAvatar
                  avatarUrl={u.avatar_url}
                  equippedRewards={u.equipped_rewards}
                  className="size-7"
                  username={u.username}
                />
                <span className="text-sm font-medium">{u.username}</span>
              </div>
              <span className="text-sm font-semibold text-yellow-600">
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
            <EmptyState className="py-4" title={t("dashboard.states.empty")} />
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
                  {new Date(r.created_at).toLocaleString()}
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
        icon={<Activity className="size-4 text-orange-500" />}
        title={t("dashboard.sections.activity")}
        contentClassName="space-y-3"
      >
        {feed.length === 0 && (
          <EmptyState className="py-4" title={t("dashboard.states.empty")} />
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
                {locale === "ro"
                  ? t("dashboard.activity.solvedMiddle")
                  : t("dashboard.activity.solvedPrefix")}
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
      <DashboardContent />
    </RouteGuard>
  );
}
