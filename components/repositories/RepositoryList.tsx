"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { repositoryHref } from "@/lib/repositories";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 12;

export function RepositoryList({ ownerId, own = false }: { ownerId: string; own?: boolean }) {
  const { t } = useLanguage();
  const repositories = useInfiniteQuery({
    queryKey: ["editor-snippets", "repositories", ownerId, own],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      let query = supabase.from("snippets").select("id, title, description, is_public")
        .eq("user_id", ownerId)
        .eq("is_live_workspace", false);
      if (!own) query = query.eq("is_public", true);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE)
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, _, offset) =>
      lastPage.length > PAGE_SIZE ? offset + PAGE_SIZE : undefined,
  });

  const rows = repositories.data?.pages.flatMap((page) => page.slice(0, PAGE_SIZE)) ?? [];

  return (
    <div className="space-y-3">
      {repositories.isPending && <p role="status" className="text-sm">{t("repositories.loading")}</p>}
      {repositories.isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm">{t("repositories.loadError")}</p>
          <Button variant="outline" onClick={() => void (repositories.isFetchNextPageError
            ? repositories.fetchNextPage()
            : repositories.refetch())}>{t("repositories.retry")}</Button>
        </div>
      )}
      {repositories.isSuccess && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t(own ? "repositories.empty" : "repositories.emptyPublic")}</p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-[var(--sx-radius-card)] border bg-card">
          {rows.map((repo) => (
            <li key={repo.id}>
              <Link
                href={repositoryHref(repo.id)}
                className="flex min-w-0 items-start gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
              >
                <BookOpen className="mt-1 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 font-medium wrap-anywhere">{repo.title || t("repositories.untitled")}</span>
                    {own && <Badge variant="outline">{t(repo.is_public ? "snippetPage.public" : "repositories.private")}</Badge>}
                  </div>
                  {repo.description && <p className="mt-1 line-clamp-2 text-sm wrap-anywhere text-muted-foreground">{repo.description}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {repositories.hasNextPage && !repositories.isFetchNextPageError && (
        <Button variant="outline" disabled={repositories.isFetching} onClick={() => void repositories.fetchNextPage()}>
          {t(repositories.isFetchingNextPage ? "repositories.loading" : "repositories.more")}
        </Button>
      )}
    </div>
  );
}
