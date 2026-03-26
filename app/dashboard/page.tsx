"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthGuard } from "@/components/AuthGuard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardContent({ user }: any) {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    solved: 0,
    total: 0,
    average: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("submissions")
        .select("*")
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
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length
            )
          : 0;

      setStats({ solved, total, average });
      setRecent(data.slice(0, 5));

      setLoading(false);
    }

    fetchData();
  }, [user]);

  if (loading) {
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

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          {user.email}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Solved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.solved}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problems Attempted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.average}%
            </p>
          </CardContent>
        </Card>

      </div>

      {/* RECENT */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {recent.length === 0 && (
            <p className="text-muted-foreground">
              No submissions yet.
            </p>
          )}

          {recent.map((r, i) => (
            <div
              key={i}
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="font-medium">
                  Problem {r.problem_id}
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
    <AuthGuard>
      {(user: any) => <DashboardContent user={user} />}
    </AuthGuard>
  );
}