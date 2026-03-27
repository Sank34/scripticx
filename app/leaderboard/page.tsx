"use client";

import { useEffect, useState } from "react";
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

export default function LeaderboardPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_score")
        .order("total_score", { ascending: false })
        .limit(50);

      setUsers(data || []);
    }

    fetchLeaderboard();
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  function getInitial(name: string) {
    return name?.[0]?.toUpperCase() || "U";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Top users ranked by total score
        </p>
      </div>

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
                  {top3[1].total_score || 0} pts
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
                  {top3[0].total_score || 0} pts
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
                  {top3[2].total_score || 0} pts
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
                {user.total_score || 0}
              </span>
            </Link>
          ))}

        </CardContent>
      </Card>

    </div>
  );
}