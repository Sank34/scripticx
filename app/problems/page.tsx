"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";

export default function ProblemsPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [filter, setFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");

  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data: problemsData } = await supabase
        .from("problems")
        .select("*");

      if (problemsData) {
        setProblems(problemsData);
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: submissions } = await supabase
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id);

      const bestScores: Record<string, number> = {};

      submissions?.forEach((sub) => {
        if (
          !bestScores[sub.problem_id] ||
          sub.score > bestScores[sub.problem_id]
        ) {
          bestScores[sub.problem_id] = sub.score;
        }
      });

      setProgress(bestScores);
      setLoading(false);
    }

    fetchAll();
  }, [user]);

  const filteredProblems = problems.filter((p) => {
    return (
      (filter === "all" || p.difficulty === filter) &&
      (getLocalized(p.title_i18n, locale).toLowerCase().includes(search.toLowerCase()) ||
        getLocalized(p.description_i18n, locale).toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">{t("problems.title")}</h1>

      <Input
        placeholder={t("problems.searchPlaceholder")}
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
            {t(`problems.filters.${f}`)}
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
                        {getLocalized(p.title_i18n, locale)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {getLocalized(p.description_i18n, locale)}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center">

                      <span className="text-sm font-medium">
                        {score === 100
                          ? t("problems.status.solved")
                          : score
                          ? `${score}%`
                          : t("problems.status.notStarted")}
                      </span>

                      <Badge
                        variant={
                          p.difficulty === "easy"
                            ? "secondary"
                            : p.difficulty === "medium"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {t(`problems.filters.${p.difficulty}`)}
                      </Badge>

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