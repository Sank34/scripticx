"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestSlug } from "@/lib/updates";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdatesEmptyState } from "@/app/updates/empty-state";

export function UpdatesLatestRedirect() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { data: slug, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["updates", "latest-slug"],
    queryFn: fetchLatestSlug,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    // Wait for the fresh result, even if persisted cache contains an old slug.
    if (!isPending && !isFetching && !isError && slug) {
      router.replace(`/updates/${encodeURIComponent(slug)}`);
    }
  }, [isPending, isFetching, isError, slug, router]);

  if (isError) return (
    <div role="alert" className="space-y-4">
      <p>{locale === "ro" ? "Noutățile nu au putut fi încărcate." : "Updates could not be loaded."}</p>
      <Button variant="outline" onClick={() => void refetch()}>{locale === "ro" ? "Reîncearcă" : "Retry"}</Button>
    </div>
  );
  if (!isPending && !isFetching && !slug) return <UpdatesEmptyState />;
  return <div aria-busy="true" className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-48 w-full" /></div>;
}
