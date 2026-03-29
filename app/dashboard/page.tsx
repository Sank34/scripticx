"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Trophy, Activity } from "lucide-react";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

function DashboardContent() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    solved: 0,
    total: 0,
    average: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const { data } = await supabase
        .from("submissions")
        .select(`
          *,
          problems (
            title_i18n
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!data) {
        setLoading(false);
        return;
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

      setStats({ solved, total, average });
      setRecent(data.slice(0, 5));

      const { data: users } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_score")
        .order("total_score", { ascending: false })
        .limit(5);

      setLeaderboard(users || []);

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

          const merged = feedData.map((item: any) => ({
            ...item,
            profile: userMap[item.user_id],
          }));

          setFeed(merged);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

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

      <div>
        <h1 className="text-3xl font-bold">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">
          {user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              {t("dashboard.stats.solved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">
              {stats.solved}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle>{t("dashboard.stats.score")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle>{t("dashboard.stats.streak")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {stats.average}%
            </p>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {t("leaderboard.title")}
          </CardTitle>
          <a
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            {t("common.viewAll")}
          </a>
        </CardHeader>

        <CardContent className="space-y-3">

          {leaderboard.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {t("dashboard.states.empty")}
            </p>
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

                <Avatar className="w-7 h-7">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback>
                    {u.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span className="text-sm">
                  {u.username}
                </span>

              </div>

              <span className="text-sm font-semibold text-yellow-500">
                {u.total_score || 0}
              </span>

            </div>
          ))}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            {t("dashboard.sections.activity")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {feed.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {t("dashboard.states.empty")}
            </p>
          )}

          {feed.map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-2">

              <div className="flex items-center gap-3">

                <a
                  href={`/u/${item.profile?.username}`}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                >
                  <Avatar className="w-7 h-7">
                    {item.profile?.avatar_url && (
                      <AvatarImage src={item.profile.avatar_url} />
                    )}
                    <AvatarFallback>
                      {item.profile?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

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

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.recent")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {recent.length === 0 && (
            <p className="text-muted-foreground">
              {t("dashboard.states.empty")}
            </p>
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

        </CardContent>
      </Card>

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