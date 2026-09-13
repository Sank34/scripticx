"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";
import { PodiumCard } from "@/components/leaderboard/PodiumCard";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Crown, Medal, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import type { EquippedRewards } from "@/lib/rewards";

type LeaderboardUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  equipped_rewards?: EquippedRewards | null;
  total_score: number;
};

async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, total_score, equipped_rewards")
    .order("total_score", { ascending: false })
    .limit(50);

  return data || [];
}

export default function LeaderboardPage() {
  const { t } = useLanguage();

  const {
    data: users = [],
    isLoading: loading,
  } = useQuery<LeaderboardUser[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title={t("leaderboard.title")}
          subtitle={t("leaderboard.description")}
        />
        <Link
          href="/community"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("leaderboard.community")}
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {top3[1] && (
              <PodiumCard
                className="cursor-pointer bg-zinc-100 transition hover:scale-[1.02] dark:bg-muted/70"
                icon={Medal}
                iconClassName="w-6 h-6 text-muted-foreground"
                pointsLabel={t("leaderboard.points")}
                rank={2}
                user={top3[1]}
              />
            )}

            {top3[0] && (
              <PodiumCard
                className="scale-105 cursor-pointer bg-amber-100 transition hover:scale-110 dark:bg-amber-500/20"
                icon={Crown}
                iconClassName="w-7 h-7 text-yellow-700 dark:text-yellow-300"
                pointsLabel={t("leaderboard.points")}
                rank={1}
                user={top3[0]}
              />
            )}

            {top3[2] && (
              <PodiumCard
                className="cursor-pointer bg-orange-100 transition hover:scale-[1.02] dark:bg-orange-500/20"
                icon={Trophy}
                iconClassName="w-6 h-6 text-orange-600 dark:text-orange-400"
                pointsLabel={t("leaderboard.points")}
                rank={3}
                user={top3[2]}
              />
            )}

          </div>

          <Card>
            <CardContent className="p-0">

              {rest.map((user, index) => (
                <LeaderboardRow
                  key={user.id}
                  pointsLabel={t("leaderboard.points")}
                  rank={index + 4}
                  user={user}
                />
              ))}

            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
