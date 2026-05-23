"use client";

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

type LeaderboardUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_score: number;
};

async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, total_score")
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
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      <PageHeader
        title={t("leaderboard.title")}
        subtitle={t("leaderboard.description")}
      />

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
                className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-muted dark:to-muted/60 cursor-pointer hover:scale-[1.02] transition"
                icon={Medal}
                iconClassName="w-6 h-6 text-gray-500"
                pointsLabel={t("leaderboard.points")}
                rank={2}
                user={top3[1]}
              />
            )}

            {top3[0] && (
              <PodiumCard
                className="bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-500/30 dark:to-yellow-600/20 scale-105 cursor-pointer hover:scale-110 transition"
                icon={Crown}
                iconClassName="w-7 h-7 text-yellow-700 dark:text-yellow-300"
                pointsLabel={t("leaderboard.points")}
                rank={1}
                user={top3[0]}
              />
            )}

            {top3[2] && (
              <PodiumCard
                className="bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-500/30 dark:to-orange-600/20 cursor-pointer hover:scale-[1.02] transition"
                icon={Trophy}
                iconClassName="w-6 h-6 text-orange-600"
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
