"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Markdown } from "@/components/Markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchUpdate } from "@/lib/updates";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";

export default function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { locale } = useLanguage();

  const { data: update, isLoading } = useQuery({
    queryKey: ["update", slug],
    queryFn: () => fetchUpdate(slug),
  });

  if (isLoading) {
    return (
      <article className="max-w-3xl space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </article>
    );
  }

  if (!update) {
    notFound();
  }

  const tagStyle =
    update.tag === "new"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : update.tag === "fix"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
      : update.tag === "improved"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      : "bg-muted text-muted-foreground";

  const tagLabel =
    update.tag === "new"
      ? "New"
      : update.tag === "fix"
      ? "Fix"
      : update.tag === "improved"
      ? "Improved"
      : null;

  return (
    <article className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {update.tag && (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${tagStyle}`}
          >
            {tagLabel}
          </span>
        )}
        <span>{update.date}</span>
      </div>

      <Markdown>{getLocalized(update.content_i18n, locale)}</Markdown>
    </article>
  );
}
