"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Search, Trophy, ArrowUpRight, UserX } from "lucide-react";

function normalize(str: string) {
  return str.toLowerCase().trim();
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("recent_searches");
    if (stored) setRecent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchTopUsers();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim()) {
        fetchUsers(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  async function fetchTopUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, total_score")
      .order("total_score", { ascending: false })
      .limit(5);

    if (data) setTopUsers(data);
  }

  async function fetchUsers(q: string) {
    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, total_score")
      .ilike("username", `%${q}%`)
      .limit(10);

    setResults(data || []);
    setLoading(false);
  }

  function goToUser(username: string) {
    router.push(`/u/${username}`);
  }

  function handleSearch(value: string) {
    setQuery(value);
  }

  function handleSubmit(e: any) {
    e.preventDefault();
    if (!query.trim()) return;

    const updated = [query, ...recent.filter((r) => r !== query)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));

    router.push(`/search?q=${query}`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-10"
        />
      </form>

      {!query && topUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <p className="font-medium">Top Users</p>
          </div>

          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <Card
                key={u.id}
                onClick={() => goToUser(u.username)}
                className="cursor-pointer hover:scale-[1.01] transition"
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">
                      #{i + 1}
                    </span>

                    <Avatar>
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback>
                        {u.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.total_score || 0} pts
                      </p>
                    </div>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!query && recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Recent searches</p>
          <div className="flex gap-2 flex-wrap">
            {recent.map((r, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setQuery(r)}
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {query && (
        <div className="space-y-2">

          {loading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <UserX className="mx-auto w-6 h-6" />
              <p>No users found</p>
            </div>
          )}

          {results.map((u) => (
            <Card
              key={u.id}
              onClick={() => goToUser(u.username)}
              className="cursor-pointer hover:scale-[1.01] transition"
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">

                  <Avatar>
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback>
                      {u.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">{u.username}</p>

                    {u.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {u.bio}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {u.total_score || 0} pts
                    </p>
                  </div>

                </div>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}

        </div>
      )}

    </div>
  );
}