"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type StarSummary = { star_count: number; starred: boolean };

export function RepositoryStarButton({
  repositoryId,
  viewerId,
  initialSummary,
  repositoryTitle,
}: {
  repositoryId: string;
  viewerId?: string;
  initialSummary?: StarSummary;
  repositoryTitle?: string;
}) {
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const queryKey = ["repository-stars", repositoryId, viewerId ?? null] as const;
  const summary = useQuery({
    queryKey,
    initialData: initialSummary,
    staleTime: initialSummary ? 30_000 : 0,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc("get_repository_stars", { p_repository_id: repositoryId })
        .abortSignal(signal)
        .single<StarSummary>();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (starred: boolean) => {
      const { data, error } = await supabase
        .rpc("set_repository_star", { p_repository_id: repositoryId, p_starred: starred })
        .single<StarSummary>();
      if (error) throw error;
      return data;
    },
    onMutate: () => queryClient.cancelQueries({ queryKey, exact: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: ["feed-repositories"] });
    },
    onError: () => toast.error(t("repositories.starSaveError")),
  });

  if (summary.isError && !summary.data) {
    return (
      <Button variant="outline" onClick={() => void summary.refetch()} disabled={summary.isFetching}>
        <Star aria-hidden="true" />
        {t("repositories.starRetry")}
      </Button>
    );
  }

  const starred = summary.data?.starred ?? false;
  const count = summary.data && new Intl.NumberFormat(locale).format(summary.data.star_count);
  const label = t(starred ? "repositories.starred" : "repositories.star");
  const contents = (
    <>
      <Star aria-hidden="true" className={starred ? "fill-current" : undefined} />
      {label}
      {count !== undefined && (
        <span className="rounded bg-muted px-1.5 text-xs tabular-nums" aria-live="polite">
          {count}
        </span>
      )}
    </>
  );

  if (!viewerId) {
    return (
      <Button variant="outline" asChild>
        <Link href="/login" aria-label={t("repositories.starSignIn")}>{contents}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={repositoryTitle ? t("feed.starRepository", { title: repositoryTitle }) : undefined}
      aria-pressed={starred}
      aria-busy={summary.isPending || mutation.isPending}
      disabled={!summary.data || mutation.isPending}
      onClick={() => mutation.mutate(!starred)}
    >
      {contents}
    </Button>
  );
}
