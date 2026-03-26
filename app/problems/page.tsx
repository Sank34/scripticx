"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { problems } from "@/lib/problems";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemsPage() {
  const [filter, setFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");

  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id);

      const bestScores: Record<string, number> = {};

      data?.forEach((sub) => {
        if (!bestScores[sub.problem_id] || sub.score > bestScores[sub.problem_id]) {
          bestScores[sub.problem_id] = sub.score;
        }
      });

      setProgress(bestScores);
      setLoading(false);
    }

    fetchProgress();
  }, []);

  const filteredProblems = problems.filter((p) => {
    return (
      (filter === "all" || p.difficulty === filter) &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Problems</h1>

      <Input
        placeholder="Search problems..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2">
        {["all", "easy", "medium", "hard"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f as any)}
          >
            {f}
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

                    <div>
                      <h2 className="text-lg font-semibold">
                        {p.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center">
                      <span className="text-sm">
                        {score === 100
                          ? "Solved"
                          : score
                          ? `${score}%`
                          : "Not started"}
                      </span>

                      <Badge>{p.difficulty}</Badge>
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