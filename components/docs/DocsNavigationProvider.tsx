"use client";

import { createContext, useContext } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { DocsLocale, DocsNavigationItem } from "@/lib/docs-content";

export type DocsSidebarPages = Record<DocsLocale, DocsNavigationItem[]>;

const DocsNavigationContext = createContext<{
  docs: DocsSidebarPages;
  examples: DocsSidebarPages;
}>({ docs: { en: [], ro: [] }, examples: { en: [], ro: [] } });

export function DocsNavigationProvider({
  pages,
  examples,
  children,
}: {
  pages: DocsSidebarPages;
  examples: DocsSidebarPages;
  children: React.ReactNode;
}) {
  return <DocsNavigationContext.Provider value={{ docs: pages, examples }}>{children}</DocsNavigationContext.Provider>;
}

export function useDocsSidebarPages() {
  const { locale } = useLanguage();
  return useContext(DocsNavigationContext).docs[locale];
}

export function useExamplesSidebarPages() {
  const { locale } = useLanguage();
  return useContext(DocsNavigationContext).examples[locale];
}
