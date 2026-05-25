"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Trophy, Activity, CalendarDays } from "lucide-react";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";
import { api, type DailyChallenge } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
          *,
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
      .select("id, username, avatar_url, total_score")
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
          .select("id, username, avatar_url")
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
    <div className="p-6 space-y-6">

      <PageHeader
        title={t("dashboard.title")}
        subtitle={user.email}
      />

      {dailyChallenge?.problems && (
        <SectionCard
          icon={<CalendarDays className="h-4 w-4 text-orange-500" />}
          title={locale === "ro" ? "Challenge-ul zilei" : "Daily challenge"}
          action={
            <Button asChild size="sm">
              <a href={`/problems/${dailyChallenge.problem_id}`}>
                {locale === "ro" ? "Rezolvă" : "Solve"}
              </a>
            </Button>
          }
          contentClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {dailyChallenge.problems.code != null && (
                <span className="mr-2 font-mono text-muted-foreground">
                  #{dailyChallenge.problems.code}
                </span>
              )}
              {getLocalized(dailyChallenge.problems.title_i18n, locale)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {locale === "ro"
                ? "O problemă nouă în fiecare zi pentru streak și puncte bonus."
                : "A fresh problem every day for streaks and bonus points."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
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
        </SectionCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <StatCard
          className="border-green-500/30"
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          title={t("dashboard.stats.solved")}
          value={stats.solved}
          valueClassName="text-2xl font-bold text-orange-500"
        />

        <StatCard
          className="border-blue-500/30"
          title={t("dashboard.stats.score")}
          value={stats.total}
          valueClassName="text-2xl font-bold text-blue-500"
        />

        <StatCard
          className="border-purple-500/30"
          title={t("dashboard.stats.streak")}
          value={`${stats.average}%`}
          valueClassName="text-2xl font-bold text-green-500"
        />

      </div>

      <SectionCard
        icon={<Trophy className="w-4 h-4 text-yellow-500" />}
        title={t("leaderboard.title")}
        action={
          <a
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            {t("common.viewAll")}
          </a>
        }
        contentClassName="space-y-3"
      >

          {leaderboard.length === 0 && (
            <EmptyState className="py-4" title={t("dashboard.states.empty")} />
          )}

          {leaderboard.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">

                <span className="text-sm font-medium w-5">
                  #{i + 1}
                </span>

                <UserAvatar
                  avatarUrl={u.avatar_url}
                  className="w-7 h-7"
                  username={u.username}
                />

                <span className="text-sm">
                  {u.username}
                </span>

              </div>

              <span className="text-sm font-semibold text-yellow-500">
                {u.total_score || 0}
              </span>

            </div>
          ))}

      </SectionCard>

      <SectionCard
        icon={<Activity className="w-4 h-4 text-orange-500" />}
        title={t("dashboard.sections.activity")}
        contentClassName="space-y-3"
      >

          {feed.length === 0 && (
            <EmptyState className="py-4" title={t("dashboard.states.empty")} />
          )}

          {feed.map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-2">

              <div className="flex items-center gap-3">

                <a
                  href={`/u/${item.profile?.username}`}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                >
                  <UserAvatar
                    avatarUrl={item.profile?.avatar_url}
                    className="w-7 h-7"
                    username={item.profile?.username}
                  />

                  <span className="font-medium text-sm">
                    {item.profile?.username}
                  </span>

                  {locale === "en" && (
                    <span className="text-sm text-muted-foreground">
                      {t("dashboard.activity.solvedPrefix")}
                    </span>
                  )}

                  {locale === "ro" && (
                    <span className="text-sm text-muted-foreground">
                      {t("dashboard.activity.solvedMiddle")}
                    </span>
                  )}
                </a>

                <a
                  href={`/problems/${item.problem_id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {getLocalized(item.problems?.title_i18n, locale)}
                </a>

              </div>

              <Badge>
                {item.score}%
              </Badge>

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
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="font-medium">
                  {getLocalized(r.problems?.title_i18n, locale) || t("dashboard.states.unknownProblem")}
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
