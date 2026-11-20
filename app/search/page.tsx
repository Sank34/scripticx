"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { directorySearchHref, parseSearchScope, searchScopes } from "@/lib/directory-search";
import { repositoryHref } from "@/lib/repositories";
import { useDirectorySearch } from "@/hooks/useDirectorySearch";
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

import { BookOpen, Clock3, Search, Users, UserX, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

function SearchContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const routeQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(routeQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const scope = parseSearchScope(searchParams.get("type"));
  const directory = useDirectorySearch(query, scope, 12);

  useEffect(() => {
    setQuery(routeQuery);
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;

    const normalizedQuery = query.trim();
    const updated = [normalizedQuery, ...recent.filter((r) => r !== normalizedQuery)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
    router.push(directorySearchHref(normalizedQuery, scope));
  }

  function selectRecent(value: string) {
    setQuery(value);
    router.push(directorySearchHref(value, scope));
  }

  function clearSearch() {
    setQuery("");
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
              onChange={(event) => setQuery(event.target.value)}
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
        <div className="grid items-start gap-5 md:grid-cols-[11rem_minmax(0,1fr)]">
          <nav aria-label={t("search.filters")} className="flex flex-wrap gap-1 md:flex-col">
            {searchScopes.map((filter) => (
              <Button key={filter} variant={scope === filter ? "secondary" : "ghost"} className="min-h-10 justify-start" asChild>
                <Link href={directorySearchHref(query, filter)} aria-current={scope === filter ? "page" : undefined}>
                  {t(`search.${filter}`)}
                </Link>
              </Button>
            ))}
          </nav>

          <div className="min-w-0 space-y-4">
            {scope !== "users" && (
              <Card>
                <CardHeader className="border-b"><h2 className="font-semibold">{t("search.repositories")}</h2></CardHeader>
                <CardContent>
                  {directory.waiting || directory.repositories.isPending ? (
                    <p role="status" className="text-sm text-muted-foreground">{t("search.refreshing")}</p>
                  ) : directory.repositoryResults.length ? (
                    <ul className="divide-y">
                      {directory.repositoryResults.map((repo) => (
                        <li key={repo.id}>
                          <Link href={repositoryHref(repo.id)} className="flex min-h-11 gap-3 rounded-md px-2 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                            <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0 wrap-anywhere">
                              <p className="font-medium">{repo.owner ? `${repo.owner}/` : ""}{repo.title || t("repositories.untitled")}</p>
                              {repo.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : !directory.repositories.isError && (
                    <p className="text-sm text-muted-foreground">{t("search.noRepositories")}</p>
                  )}
                  {directory.repositories.isError && (
                    <p role="alert" className="text-sm">{t("search.repositoryError")}</p>
                  )}
                  {!directory.waiting && (directory.repositories.hasNextPage || directory.repositories.isError) && (
                    <Button type="button" variant="outline" className="mt-3" disabled={directory.repositories.isFetching} onClick={() => void (
                      directory.repositories.hasNextPage ? directory.repositories.fetchNextPage() : directory.repositories.refetch()
                    )}>
                      {t(directory.repositories.isError ? "search.retry" : "search.more")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            {scope !== "repositories" && (
              <Card>
                <CardHeader className="border-b"><h2 className="font-semibold">{t("search.users")}</h2></CardHeader>
                <CardContent>
                  {directory.waiting || directory.users.isPending ? (
                    <p role="status" className="text-sm text-muted-foreground">{t("search.refreshing")}</p>
                  ) : directory.userResults.length ? (
                    <div className="divide-y">
                      {directory.userResults.map((user) => (
                        <UserListItem
                          key={user.id}
                          avatarUrl={user.avatar_url}
                          equippedRewards={user.equipped_rewards}
                          description={user.bio}
                          href={`/u/${encodeURIComponent(user.username)}`}
                          username={user.username}
                          variant="row"
                        />
                      ))}
                    </div>
                  ) : !directory.users.isError && (
                    <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
                  )}
                  {directory.users.isError && <p role="alert" className="text-sm">{t("search.loadError")}</p>}
                  {!directory.waiting && (directory.users.hasNextPage || directory.users.isError) && (
                    <Button type="button" variant="outline" className="mt-3" disabled={directory.users.isFetching} onClick={() => void (
                      directory.users.hasNextPage ? directory.users.fetchNextPage() : directory.users.refetch()
                    )}>
                      {t(directory.users.isError ? "search.retry" : "search.more")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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
