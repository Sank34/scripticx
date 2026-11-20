"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Star } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { RepositoryStarButton } from "@/components/repositories/RepositoryStarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { repositoryHref } from "@/lib/repositories";
import { supabase } from "@/lib/supabase";

type FeedRepository = {
  id: string;
  title: string | null;
  description: string | null;
  owner_username: string | null;
  created_at: string;
  star_count: number;
  starred: boolean;
};

export function FeedRepositories({ viewerId, popular = false }: { viewerId: string; popular?: boolean }) {
  const { locale, t } = useLanguage();
  const repositories = useQuery({
    queryKey: ["feed-repositories", viewerId, popular],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc("get_feed_repositories", { p_popular: popular })
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []) as FeedRepository[];
    },
  });
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <Card className="min-w-0 gap-0 rounded-xl py-0 shadow-none ring-border/80">
      <CardHeader className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {t(popular ? "feed.popularRepositories" : "feed.recentRepositories")}
        </h2>
      </CardHeader>
      <CardContent className="px-4">
        {repositories.isPending ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">{t("repositories.loading")}</p>
        ) : repositories.isError ? (
          <div className="space-y-3 py-4">
            <p role="alert" className="text-sm">{t("repositories.loadError")}</p>
            <Button variant="outline" onClick={() => void repositories.refetch()}>{t("repositories.retry")}</Button>
          </div>
        ) : repositories.data.length ? (
          <ul className="divide-y">
            {repositories.data.map((repo) => (
              <li key={repo.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={repositoryHref(repo.id)} className="inline-flex min-w-0 items-start gap-2 rounded text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 wrap-anywhere">
                      {repo.owner_username && `${repo.owner_username}/`}{repo.title || t("repositories.untitled")}
                    </span>
                  </Link>
                  {repo.description && (
                    <p className="mt-1 line-clamp-2 text-sm wrap-anywhere text-muted-foreground">{repo.description}</p>
                  )}
                  {popular ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star aria-hidden="true" className="size-3.5" />
                      {t("feed.repositoryStars", { count: numbers.format(repo.star_count) })}
                    </p>
                  ) : (
                    <time dateTime={repo.created_at} className="mt-2 block text-xs text-muted-foreground">
                      {dates.format(new Date(repo.created_at))}
                    </time>
                  )}
                </div>
                {!popular && (
                  <RepositoryStarButton
                    repositoryId={repo.id}
                    viewerId={viewerId}
                    initialSummary={{ star_count: repo.star_count, starred: repo.starred }}
                    repositoryTitle={repo.title || t("repositories.untitled")}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            {t(popular ? "feed.noStarredRepositories" : "repositories.emptyPublic")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
