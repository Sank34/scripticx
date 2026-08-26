"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { UserListItem } from "@/components/user/UserListItem";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Clock3, Loader2, Search, UserRoundSearch, Users, UserX, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

function SearchContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const routeQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(routeQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(routeQuery.trim());
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setQuery(routeQuery);
    setDebouncedQuery(routeQuery.trim());
  }, [routeQuery]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_searches");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {
      localStorage.removeItem("recent_searches");
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  const {
    data: topUsers = [],
    isError: topUsersError,
    isPending: topUsersLoading,
    refetch: refetchTopUsers,
  } = useQuery({
    queryKey: ["search", "top-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_score, equipped_rewards")
        .order("total_score", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: results = [],
    isError: resultsError,
    isFetching,
    isPending: loading,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ["search", "profiles", debouncedQuery.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, total_score, equipped_rewards")
        .ilike("username", `%${debouncedQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(debouncedQuery),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previous) => previous ?? [],
  });

  function handleSearch(value: string) {
    setQuery(value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;

    const normalizedQuery = query.trim();
    const updated = [normalizedQuery, ...recent.filter((r) => r !== normalizedQuery)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
    setDebouncedQuery(normalizedQuery);

    router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  }

  function selectRecent(value: string) {
    setQuery(value);
    setDebouncedQuery(value);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function clearSearch() {
    setQuery("");
    setDebouncedQuery("");
    router.push("/search");
  }

  function clearRecent() {
    setRecent([]);
    localStorage.removeItem("recent_searches");
  }

  const hasQuery = Boolean(query.trim());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-[var(--sx-radius-panel)] border bg-card text-card-foreground">
        <div className="p-6 sm:p-8">
          <PageHeader
            title={t("search.title")}
            subtitle={t("search.subtitle")}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:p-6"
          role="search"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("search.placeholder")}
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={t("search.placeholder")}
              className="h-10 pl-9 pr-10"
              autoComplete="off"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("search.clearSearch")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
          <Button type="submit" size="lg" className="h-10" disabled={!query.trim()}>
            <Search className="size-4" />
            {t("search.submit")}
          </Button>
        </form>
      </section>

      {!hasQuery ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{t("search.suggested")}</CardTitle>
              <CardDescription>{t("search.suggestedDescription")}</CardDescription>
              {!topUsersLoading && !topUsersError ? (
                <CardAction>
                  <Badge variant="outline">{topUsers.length}</Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="px-2">
              {topUsersLoading ? (
                <div className="space-y-1" aria-label={t("search.refreshing")}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 px-2 py-2.5">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40 max-w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topUsersError ? (
                <EmptyState
                  className="py-10"
                  icon={<UserX className="size-6" />}
                  title={t("search.loadError")}
                  description={t("search.loadErrorDescription")}
                  action={
                    <Button variant="outline" onClick={() => void refetchTopUsers()}>
                      {t("search.retry")}
                    </Button>
                  }
                />
              ) : topUsers.length ? (
                <div className="divide-y">
                  {topUsers.map((user, index) => (
                    <UserListItem
                      key={user.id}
                      avatarUrl={user.avatar_url}
                      equippedRewards={user.equipped_rewards}
                      href={`/u/${user.username}`}
                      meta={`${user.total_score || 0} ${t("search.points")}`}
                      rank={index + 1}
                      username={user.username}
                      variant="row"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="py-10"
                  icon={<Users className="size-6" />}
                  title={t("search.noResults")}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>{t("search.recent")}</CardTitle>
              <CardDescription>{t("search.recentDescription")}</CardDescription>
              {recent.length ? (
                <CardAction>
                  <Button variant="ghost" size="sm" onClick={clearRecent}>
                    {t("search.clearRecent")}
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {recent.length ? (
                <div className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant="secondary"
                      onClick={() => selectRecent(item)}
                      className="max-w-full"
                    >
                      <Clock3 className="size-3.5" />
                      <span className="truncate">{item}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="py-8"
                  icon={<Clock3 className="size-6" />}
                  title={t("search.noRecent")}
                  description={t("search.noRecentDescription")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t("search.results")}</CardTitle>
            <CardDescription>{t("search.resultsDescription")}</CardDescription>
            {!loading && !resultsError ? (
              <CardAction>
                <div className="flex items-center gap-2">
                  {isFetching ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t("search.refreshing")}
                    </span>
                  ) : null}
                  <Badge variant="outline">
                    {results.length} {results.length === 1 ? t("search.result") : t("search.resultsCount")}
                  </Badge>
                </div>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-2">
            {loading ? (
              <div className="space-y-1" aria-label={t("search.refreshing")}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-2 py-2.5">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-44 max-w-full" />
                      <Skeleton className="h-3 w-64 max-w-[70%]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resultsError ? (
              <EmptyState
                className="py-12"
                icon={<UserX className="size-6" />}
                title={t("search.loadError")}
                description={t("search.loadErrorDescription")}
                action={
                  <Button variant="outline" onClick={() => void refetchResults()}>
                    {t("search.retry")}
                  </Button>
                }
              />
            ) : results.length ? (
              <div className="divide-y" aria-live="polite">
                {results.map((user) => (
                  <UserListItem
                    key={user.id}
                    avatarUrl={user.avatar_url}
                    equippedRewards={user.equipped_rewards}
                    description={user.bio}
                    href={`/u/${user.username}`}
                    meta={`${user.total_score || 0} ${t("search.points")}`}
                    username={user.username}
                    variant="row"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                className="py-14"
                icon={<UserRoundSearch className="size-7" />}
                title={t("search.noResults")}
                description={t("search.noResultsDescription")}
                action={
                  <Button variant="outline" onClick={clearSearch}>
                    {t("search.clearSearch")}
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
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
