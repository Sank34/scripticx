"use client";

import { ChevronRight, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DocsNavigationNode } from "@/lib/docs-content";
import type { MarkdownCollection } from "@/lib/docs-content";
import { cn } from "@/lib/utils";

type DocsNavigationByLocale = Record<"en" | "ro", DocsNavigationNode[]>;

function includesQuery(node: DocsNavigationNode, query: string): boolean {
  if (!query) return true;
  if (node.title.toLocaleLowerCase().includes(query)) return true;
  return node.type === "group" && node.items.some((item) => includesQuery(item, query));
}

function NavigationTree({
  nodes,
  pathname,
  query,
  onNavigate,
  level = 0,
}: {
  nodes: DocsNavigationNode[];
  pathname: string;
  query: string;
  onNavigate?: () => void;
  level?: number;
}) {
  return (
    <div className={cn("space-y-1", level > 0 && "ml-3 border-l border-border/70 pl-3")}>
      {nodes.filter((node) => includesQuery(node, query)).map((node) => {
        if (node.type === "doc") {
          const active = pathname === node.href;
          return (
            <Button
              asChild
              key={node.href}
              variant="ghost"
              className={cn(
                "h-auto min-h-9 w-full justify-start rounded-lg px-2.5 py-2 text-left text-[13px] font-medium",
                active
                  ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Link aria-current={active ? "page" : undefined} href={node.href} onClick={onNavigate}>
                {node.title}
              </Link>
            </Button>
          );
        }

        return (
          <details className="group/category" key={`${level}-${node.title}`} open={!node.collapsed || Boolean(query)}>
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span>{node.title}</span>
              <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-open/category:rotate-90" />
            </summary>
            <NavigationTree
              level={level + 1}
              nodes={node.items}
              onNavigate={onNavigate}
              pathname={pathname}
              query={query}
            />
          </details>
        );
      })}
    </div>
  );
}

function DocsNavigation({
  collection,
  navigation,
  onNavigate,
}: {
  collection: MarkdownCollection;
  navigation: DocsNavigationNode[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const isExamples = collection === "examples";
  const title = isExamples
    ? locale === "ro" ? "Exemple" : "Examples"
    : locale === "ro" ? "Documentație" : "Documentation";
  const rootHref = isExamples ? "/examples/basics" : "/docs/basics";
  const hasResults = useMemo(
    () => navigation.some((node) => includesQuery(node, query)),
    [navigation, query],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-3 py-4">
        <Link className="flex items-center px-1" href={rootHref} onClick={onNavigate}>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {title}
            </span>
            <span className="block text-xs text-muted-foreground">MiniScript+</span>
          </span>
        </Link>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={locale === "ro" ? "Caută în documentație" : "Search documentation"}
            className="h-9 bg-background pl-8 text-xs"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              locale === "ro"
                ? isExamples ? "Caută exemple…" : "Caută în pagini…"
                : isExamples ? "Search examples…" : "Search pages…"
            }
            type="search"
            value={search}
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label={locale === "ro" ? "Navigația documentației" : "Documentation navigation"} className="p-3">
          {hasResults ? (
            <NavigationTree nodes={navigation} onNavigate={onNavigate} pathname={pathname} query={query} />
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {locale === "ro" ? "Nicio pagină găsită." : "No pages found."}
            </p>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}

export function DocsShell({
  children,
  collection = "docs",
  navigation,
}: {
  children: React.ReactNode;
  collection?: MarkdownCollection;
  navigation: DocsNavigationByLocale;
}) {
  const { locale } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = collection === "examples"
    ? locale === "ro" ? "Exemple" : "Examples"
    : locale === "ro" ? "Documentație" : "Documentation";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-card">
      <div className="flex min-h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">MiniScript+</p>
        </div>
        <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
          <SheetTrigger asChild>
            <Button aria-label={locale === "ro" ? "Deschide navigația" : "Open navigation"} size="icon-sm" variant="outline">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[min(88vw,340px)] p-0" side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>{locale === "ro" ? "Navigația documentației" : "Documentation navigation"}</SheetTitle>
              <SheetDescription>{locale === "ro" ? "Alege o pagină." : "Choose a page."}</SheetDescription>
            </SheetHeader>
            <DocsNavigation collection={collection} navigation={navigation[locale]} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-hidden border-r border-border bg-muted/12 lg:block">
          <div className="h-full min-h-0">
            <DocsNavigation collection={collection} navigation={navigation[locale]} />
          </div>
        </aside>
        <div className="docs-shell-scroll min-h-0 min-w-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
