import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { flattenDocsNavigation, normalizeDocsSlug } from "@/lib/docs-content";
import { createPageMetadata } from "@/lib/metadata";
import {
  getExamplesLocalizedPage,
  getExamplesNavigation,
  getExamplesStaticParams,
} from "@/lib/server/docs";

type ExamplesPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return getExamplesStaticParams();
}

export async function generateMetadata({
  params,
}: ExamplesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalized = normalizeDocsSlug(slug);
  const page = normalized ? getExamplesLocalizedPage(normalized).en : null;
  if (!page) {
    return createPageMetadata({
      title: "MiniScript+ Examples",
      description: "Practical MiniScript+ programs with explanations and runnable code.",
      path: "/examples",
    });
  }
  return createPageMetadata({
    title: `${page.title} · MiniScript+ Examples`,
    description: page.description,
    path: page.href,
    keywords: page.keywords,
  });
}

export default async function ExamplesPage({ params }: ExamplesPageProps) {
  const { slug } = await params;
  const normalized = normalizeDocsSlug(slug);
  const navigation = {
    en: getExamplesNavigation("en"),
    ro: getExamplesNavigation("ro"),
  };

  if (!normalized) {
    const firstPage = flattenDocsNavigation(navigation.en)[0];
    if (!firstPage) notFound();
    redirect(firstPage.href);
  }

  const localizedPage = getExamplesLocalizedPage(normalized);
  if (!localizedPage.en && !localizedPage.ro) notFound();

  return (
    <DocsArticle
      collection="examples"
      localizedPage={localizedPage}
      navigation={navigation}
    />
  );
}
