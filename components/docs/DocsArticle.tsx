"use client";

import { ArrowLeft, ArrowRight, ListTree } from "lucide-react";
import Link from "next/link";

import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  flattenDocsNavigation,
  type DocsNavigationNode,
  type DocsPageData,
  type MarkdownCollection,
} from "@/lib/docs-content";

type LocalizedPage = { en: DocsPageData | null; ro: DocsPageData | null };
type LocalizedNavigation = Record<"en" | "ro", DocsNavigationNode[]>;

export function DocsArticle({
  collection = "docs",
  localizedPage,
  navigation,
}: {
  collection?: MarkdownCollection;
  localizedPage: LocalizedPage;
  navigation: LocalizedNavigation;
}) {
  const { locale } = useLanguage();
  const page = localizedPage[locale] ?? localizedPage.en ?? localizedPage.ro;
  if (!page) return null;

  const pages = flattenDocsNavigation(navigation[locale]);
  const currentIndex = pages.findIndex((item) => item.href === page.href);
  const previous = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? pages[currentIndex + 1] : null;
  const tableOfContents = page.headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
  const rootHref = collection === "examples" ? "/examples/basics" : "/docs/basics";
  const rootLabel = collection === "examples"
    ? locale === "ro" ? "Exemple" : "Examples"
    : locale === "ro" ? "Documentație" : "Documentation";

  return (
    <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,760px)_210px] xl:justify-center">
      <article className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-12 xl:px-12">
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" href={rootHref}>
            {rootLabel}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground/75">{page.title}</span>
        </div>

        <header className="mb-10 border-b border-border pb-8">
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold leading-[1.08] text-foreground sm:text-5xl">
            {page.title}
          </h1>
          {page.description && (
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              {page.description}
            </p>
          )}
        </header>

        {tableOfContents.length > 0 && (
          <details className="mb-8 rounded-[var(--sx-radius-card)] border border-border bg-muted/20 p-4 xl:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <ListTree className="size-4" />
              {locale === "ro" ? "Pe această pagină" : "On this page"}
            </summary>
            <nav className="mt-3 border-l border-border pl-4">
              {tableOfContents.map((heading) => (
                <a
                  className="block py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href={`#${heading.id}`}
                  key={heading.id}
                >
                  {heading.title}
                </a>
              ))}
            </nav>
          </details>
        )}

        <DocsMarkdown content={page.content} sourceTitle={page.title} />

        <nav aria-label={locale === "ro" ? "Paginare documentație" : "Documentation pagination"} className="mt-16 grid grid-cols-1 gap-3 border-t border-border pt-8 sm:grid-cols-2">
          {previous ? (
            <Button asChild className="h-auto min-h-16 justify-start px-4 py-3" variant="outline">
              <Link href={previous.href}>
                <ArrowLeft className="size-4 shrink-0" />
                <span className="min-w-0 text-left">
                  <span className="block text-xs font-normal text-muted-foreground">{locale === "ro" ? "Anterior" : "Previous"}</span>
                  <span className="block truncate text-sm font-semibold">{previous.title}</span>
                </span>
              </Link>
            </Button>
          ) : <span />}
          {next && (
            <Button asChild className="h-auto min-h-16 justify-end px-4 py-3 sm:col-start-2" variant="outline">
              <Link href={next.href}>
                <span className="min-w-0 text-right">
                  <span className="block text-xs font-normal text-muted-foreground">{locale === "ro" ? "Următorul" : "Next"}</span>
                  <span className="block truncate text-sm font-semibold">{next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </Button>
          )}
        </nav>
      </article>

      <aside className="hidden border-l border-border/70 px-6 py-12 xl:block">
        <div className="sticky top-8">
          <p className="mb-3 text-xs font-semibold text-foreground">{locale === "ro" ? "Pe această pagină" : "On this page"}</p>
          {tableOfContents.length > 0 ? (
            <nav className="space-y-1 border-l border-border pl-3">
              {tableOfContents.map((heading) => (
                <a
                  className="block py-1 text-xs leading-5 text-muted-foreground transition-colors hover:text-foreground"
                  href={`#${heading.id}`}
                  key={heading.id}
                  style={{ paddingLeft: heading.depth === 3 ? 10 : 0 }}
                >
                  {heading.title}
                </a>
              ))}
            </nav>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">{locale === "ro" ? "Adaugă subtitluri pentru a genera cuprinsul." : "Add headings to generate a table of contents."}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
