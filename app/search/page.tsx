"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { UserListItem } from "@/components/user/UserListItem";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Search, Trophy, UserX } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

function SearchContent() {
  const router = useRouter();
  const { t } = useLanguage();
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

  function handleSearch(value: string) {
    setQuery(value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
          placeholder={t("search.placeholder")}
          className="pl-10"
        />
      </form>

      {!query && topUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <p className="font-medium">{t("search.topUsers")}</p>
          </div>

          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <UserListItem
                key={u.id}
                avatarUrl={u.avatar_url}
                href={`/u/${u.username}`}
                meta={`${u.total_score || 0} ${t("search.points")}`}
                rank={i + 1}
                username={u.username}
              />
            ))}
          </div>
        </div>
      )}

      {!query && recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("search.recent")}</p>
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
            <EmptyState
              icon={<UserX className="h-6 w-6" />}
              title={t("search.noResults")}
            />
          )}

          {!loading && results.map((u) => (
            <UserListItem
              key={u.id}
              avatarUrl={u.avatar_url}
              description={u.bio}
              href={`/u/${u.username}`}
              meta={`${u.total_score || 0} ${t("search.points")}`}
              username={u.username}
            />
          ))}

        </div>
      )}

    </div>
  );
}

export default function SearchPage() {
  return (
    <RouteGuard requireAuth>
      <SearchContent />
    </RouteGuard>
  );
}
