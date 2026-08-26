"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
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

  const { data: update, isLoading, isError, refetch } = useQuery({
    queryKey: ["update", slug],
    queryFn: () => fetchUpdate(slug),
  });

  if (isLoading) {
    return (
      <article className="mx-auto max-w-3xl space-y-7" aria-label={locale === "ro" ? "Se încarcă noutatea" : "Loading update"}>
        <div className="space-y-3 border-b border-border pb-7">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-11 w-4/5" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-48 w-full" />
      </article>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {locale === "ro" ? "Noutatea nu a putut fi încărcată" : "This update could not be loaded"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {locale === "ro" ? "Verifică conexiunea și încearcă din nou." : "Check the connection and try again."}
        </p>
        <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
          {locale === "ro" ? "Reîncearcă" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!update) {
    notFound();
  }

  const tagStyle =
    update.tag === "new"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : update.tag === "fix"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : update.tag === "improved"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : "border-border bg-muted text-muted-foreground";

  const tagLabel =
    update.tag === "new"
      ? locale === "ro" ? "Nou" : "New"
      : update.tag === "fix"
      ? locale === "ro" ? "Remediere" : "Fix"
      : update.tag === "improved"
      ? locale === "ro" ? "Îmbunătățit" : "Improved"
      : null;

  const date = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${update.date}T12:00:00`));

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-7">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {update.tag && (
            <span className={`rounded-full border px-2.5 py-1 font-medium ${tagStyle}`}>
              {tagLabel}
            </span>
          )}
          <time dateTime={update.date}>{date}</time>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {getLocalized(update.title_i18n, locale)}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {locale === "ro" ? "Detalii despre această versiune ScripticX." : "Details for this ScripticX release."}
        </p>
      </header>

      <div className="pt-7">
        <Markdown className="space-y-5 text-[15px] leading-7">
          {getLocalized(update.content_i18n, locale)}
        </Markdown>
      </div>
    </article>
  );
}
