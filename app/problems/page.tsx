"use client";

import Link from "next/link";
import { useState } from "react";
import { problems } from "@/lib/problems";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProblemsPage() {
  const [filter, setFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");

  const [search, setSearch] = useState("");

  const filteredProblems = problems.filter((p) => {
    const matchesFilter =
      filter === "all" || p.difficulty === filter;

    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">

      {/* TITLE */}
      <h1 className="text-3xl font-bold">Problems</h1>

      {/* SEARCH */}
      <Input
        placeholder="Search problems..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* FILTER */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>

        <Button
          variant={filter === "easy" ? "default" : "outline"}
          onClick={() => setFilter("easy")}
        >
          Easy
        </Button>

        <Button
          variant={filter === "medium" ? "default" : "outline"}
          onClick={() => setFilter("medium")}
        >
          Medium
        </Button>

        <Button
          variant={filter === "hard" ? "default" : "outline"}
          onClick={() => setFilter("hard")}
        >
          Hard
        </Button>
      </div>

      {/* LIST */}
      <div className="grid gap-4">

        {filteredProblems.length === 0 && (
          <p className="text-muted-foreground">
            No problems found.
          </p>
        )}

        {filteredProblems.map((p) => (
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

                <Badge
                  variant={
                    p.difficulty === "easy"
                      ? "secondary"
                      : p.difficulty === "medium"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {p.difficulty.toUpperCase()}
                </Badge>

              </CardContent>
            </Card>

          </Link>
        ))}

      </div>
    </div>
  );
}