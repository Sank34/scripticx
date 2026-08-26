import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { createPageMetadata } from "@/lib/metadata";
import {
  flattenDocsNavigation,
  normalizeDocsSlug,
} from "@/lib/docs-content";
import {
  getDocsLocalizedPage,
  getDocsNavigation,
  getDocsStaticParams,
} from "@/lib/server/docs";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return getDocsStaticParams();
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalized = normalizeDocsSlug(slug);
  const page = normalized ? getDocsLocalizedPage(normalized).en : null;
  if (!page) {
    return createPageMetadata({
      title: "MiniScript+ Documentation",
      description: "Reference documentation and practical MiniScript+ guides.",
      path: "/docs",
    });
  }
  return createPageMetadata({
    title: `${page.title} · MiniScript+ Docs`,
    description: page.description,
    path: page.href,
    keywords: page.keywords,
  });
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const normalized = normalizeDocsSlug(slug);
  const navigation = {
    en: getDocsNavigation("en"),
    ro: getDocsNavigation("ro"),
  };

  if (!normalized) {
    const firstPage = flattenDocsNavigation(navigation.en)[0];
    if (!firstPage) notFound();
    redirect(firstPage.href);
  }

  const localizedPage = getDocsLocalizedPage(normalized);
  if (!localizedPage.en && !localizedPage.ro) notFound();

  return <DocsArticle localizedPage={localizedPage} navigation={navigation} />;
}
