"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { markUpdatesSeen } from "@/hooks/useUnreadUpdates";
import { getLocalized } from "@/lib/getLocalized";
import { fetchUpdates, type UpdateTag } from "@/lib/updates";
import { cn } from "@/lib/utils";

export default function UpdatesLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const copy = locale === "ro"
    ? {
        title: "Noutăți",
        subtitle: "Note de versiune pentru funcționalități, îmbunătățiri și remedieri publicate în ScripticX.",
        archive: "Arhivă versiuni",
        entries: "publicări",
        loading: "Se încarcă noutățile",
        error: "Arhiva nu a putut fi încărcată.",
        tags: { new: "Nou", improved: "Îmbunătățit", fix: "Remediere" } as Record<UpdateTag, string>,
      }
    : {
        title: "What's new",
        subtitle: "Release notes for features, improvements, and fixes published across ScripticX.",
        archive: "Release archive",
        entries: "releases",
        loading: "Loading updates",
        error: "The release archive could not be loaded.",
        tags: { new: "New", improved: "Improved", fix: "Fix" } as Record<UpdateTag, string>,
      };

  const { data: updates = [], isLoading, isError } = useQuery({
    queryKey: ["updates"],
    queryFn: () => fetchUpdates(),
  });
  const latestSlug = updates[0]?.slug;

  useEffect(() => {
    if (latestSlug) markUpdatesSeen(latestSlug);
  }, [latestSlug]);

  return (
    <PageContainer variant="wide" className="space-y-8 pb-8">
      <PageHeader
        className="border-b border-border/70 pb-6"
        title={copy.title}
        subtitle={copy.subtitle}
        meta={
          !isLoading && !isError ? (
            <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              {updates.length} {copy.entries}
            </span>
          ) : null
        }
      />

      <section className="sx-surface overflow-hidden" aria-label={copy.title}>
        <div className="border-b border-border p-4 md:hidden">
          <p className="mb-3 text-sm font-semibold text-foreground">{copy.archive}</p>
          {isLoading ? (
            <div className="flex gap-2" role="status" aria-label={copy.loading}>
              <Skeleton className="h-12 w-40 shrink-0" />
              <Skeleton className="h-12 w-40 shrink-0" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">{copy.error}</p>
          ) : (
            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={copy.archive}>
              {updates.map((update) => (
                <UpdateLink
                  key={update.slug}
                  active={pathname === `/updates/${update.slug}`}
                  date={update.date}
                  href={`/updates/${update.slug}`}
                  tag={update.tag ? copy.tags[update.tag] : null}
                  title={getLocalized(update.title_i18n, locale)}
                  compact
                />
              ))}
            </nav>
          )}
        </div>

        <div className="md:grid md:min-h-[620px] md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border bg-muted/10 md:block">
            <div className="sticky top-0 max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
              <p className="px-2 pb-3 text-sm font-semibold text-foreground">{copy.archive}</p>
              {isLoading ? (
                <div className="space-y-2 px-2" role="status" aria-label={copy.loading}>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : isError ? (
                <p className="px-2 text-sm leading-6 text-destructive">{copy.error}</p>
              ) : (
                <nav className="space-y-1" aria-label={copy.archive}>
                  {updates.map((update) => (
                    <UpdateLink
                      key={update.slug}
                      active={pathname === `/updates/${update.slug}`}
                      date={update.date}
                      href={`/updates/${update.slug}`}
                      tag={update.tag ? copy.tags[update.tag] : null}
                      title={getLocalized(update.title_i18n, locale)}
                    />
                  ))}
                </nav>
              )}
            </div>
          </aside>

          <div className="min-w-0 p-5 sm:p-8 lg:p-12">{children}</div>
        </div>
      </section>
    </PageContainer>
  );
}

function UpdateLink({
  active,
  compact = false,
  date,
  href,
  tag,
  title,
}: {
  active: boolean;
  compact?: boolean;
  date: string;
  href: string;
  tag: string | null;
  title: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "sx-interactive block border text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        compact
          ? "w-44 shrink-0 rounded-[var(--sx-radius-control)] px-3 py-2.5"
          : "rounded-[var(--sx-radius-control)] px-3 py-3",
        active
          ? "border-foreground/20 bg-foreground text-background"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
      )}
    >
      <span className="line-clamp-2 text-sm font-medium leading-5">{title}</span>
      <span className={cn("mt-1 flex items-center gap-2 text-[11px]", active ? "text-background/65" : "text-muted-foreground")}>
        <span>{date}</span>
        {tag && <span>· {tag}</span>}
      </span>
    </Link>
  );
}
