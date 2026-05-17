"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

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

  function getInitial(name: string) {
    return name?.[0]?.toUpperCase() || "U";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      <div>
        <h1 className="text-3xl font-bold">
          {t("leaderboard.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("leaderboard.description")}
        </p>
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
              <Link href={`/u/${top3[1].username}`}>
                <Card className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-muted dark:to-muted/60 cursor-pointer hover:scale-[1.02] transition">
                  <CardContent className="flex flex-col items-center py-6 gap-3">
                    <Medal className="w-6 h-6 text-gray-500" />
                    <Avatar className="w-14 h-14">
                      {top3[1].avatar_url && (
                        <AvatarImage src={top3[1].avatar_url} />
                      )}
                      <AvatarFallback>
                        {getInitial(top3[1].username)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">
                      {top3[1].username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {top3[1].total_score || 0} {t("leaderboard.points")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {top3[0] && (
              <Link href={`/u/${top3[0].username}`}>
                <Card className="bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-500/30 dark:to-yellow-600/20 scale-105 cursor-pointer hover:scale-110 transition">
                  <CardContent className="flex flex-col items-center py-8 gap-3">
                    <Crown className="w-7 h-7 text-yellow-700 dark:text-yellow-300" />
                    <Avatar className="w-16 h-16">
                      {top3[0].avatar_url && (
                        <AvatarImage src={top3[0].avatar_url} />
                      )}
                      <AvatarFallback>
                        {getInitial(top3[0].username)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-lg">
                      {top3[0].username}
                    </p>
                    <p className="text-sm">
                      {top3[0].total_score || 0} {t("leaderboard.points")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {top3[2] && (
              <Link href={`/u/${top3[2].username}`}>
                <Card className="bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-500/30 dark:to-orange-600/20 cursor-pointer hover:scale-[1.02] transition">
                  <CardContent className="flex flex-col items-center py-6 gap-3">
                    <Trophy className="w-6 h-6 text-orange-600" />
                    <Avatar className="w-14 h-14">
                      {top3[2].avatar_url && (
                        <AvatarImage src={top3[2].avatar_url} />
                      )}
                      <AvatarFallback>
                        {getInitial(top3[2].username)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">
                      {top3[2].username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {top3[2].total_score || 0} {t("leaderboard.points")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

          </div>

          <Card>
            <CardContent className="p-0">

              {rest.map((user, index) => (
                <Link
                  key={user.id}
                  href={`/u/${user.username}`}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-none hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-3">

                    <span className="text-sm w-6 text-muted-foreground">
                      #{index + 4}
                    </span>

                    <Avatar className="w-8 h-8">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} />
                      )}
                      <AvatarFallback>
                        {getInitial(user.username)}
                      </AvatarFallback>
                    </Avatar>

                    <span className="font-medium">
                      {user.username}
                    </span>

                  </div>

                  <span className="font-semibold">
                    {user.total_score || 0} {t("leaderboard.points")}
                  </span>
                </Link>
              ))}

            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}