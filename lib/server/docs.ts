import "server-only";

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

import {
  normalizeDocsSlug,
  parseDocsMarkdown,
  type DocsLocale,
  type DocsNavigationNode,
  type DocsPageData,
  type MarkdownCollection,
} from "@/lib/docs-content";

type CategoryMetadata = {
  label?: string;
  position?: number;
  collapsed?: boolean;
  description?: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content");

function collectionRoot(collection: MarkdownCollection) {
  return path.join(CONTENT_ROOT, collection);
}

function titleFromSegment(value: string) {
  return value
    .replace(/^\d+[._-]?/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase());
}

function readCategory(directory: string): CategoryMetadata {
  const file = path.join(directory, "_category_.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8")) as CategoryMetadata;
  } catch (error) {
    console.warn(`Could not read docs category ${file}.`, error);
    return {};
  }
}

function pageFromFile(
  locale: DocsLocale,
  localeRoot: string,
  file: string,
  collection: MarkdownCollection,
): DocsPageData | null {
  const parsed = parseDocsMarkdown(readFileSync(file, "utf8"));
  if (parsed.frontmatter.draft) return null;
  const relative = path.relative(localeRoot, file).replace(/\\/g, "/");
  const physicalSlug = relative
    .replace(/\.md$/i, "")
    .replace(/(^|\/)index$/i, "$1");
  const slug = normalizeDocsSlug(parsed.frontmatter.slug ?? physicalSlug);
  if (!slug) return null;

  return {
    content: parsed.content,
    description: parsed.frontmatter.description,
    headings: parsed.headings,
    href: `/${collection}/${slug}`,
    keywords: parsed.frontmatter.keywords,
    locale,
    sidebarPosition: parsed.frontmatter.sidebarPosition,
    slug,
    title: parsed.frontmatter.title,
  };
}

function sortNavigation(
  entries: Array<{ node: DocsNavigationNode; position: number; title: string }>,
) {
  return entries
    .sort(
      (left, right) =>
        left.position - right.position || left.title.localeCompare(right.title),
    )
    .map((entry) => entry.node);
}

function readNavigationDirectory(
  locale: DocsLocale,
  localeRoot: string,
  directory: string,
  collection: MarkdownCollection,
): DocsNavigationNode[] {
  const entries: Array<{
    node: DocsNavigationNode;
    position: number;
    title: string;
  }> = [];

  for (const name of readdirSync(directory)) {
    if (name.startsWith(".") || name === "_category_.json") continue;
    const target = path.join(directory, name);
    if (statSync(target).isDirectory()) {
      const children = readNavigationDirectory(
        locale,
        localeRoot,
        target,
        collection,
      );
      if (children.length === 0) continue;
      const category = readCategory(target);
      const title = category.label?.trim() || titleFromSegment(name);
      entries.push({
        node: {
          collapsed: category.collapsed ?? false,
          description: category.description,
          items: children,
          title,
          type: "group",
        },
        position: category.position ?? 999,
        title,
      });
      continue;
    }
    if (!name.endsWith(".md")) continue;
    const page = pageFromFile(locale, localeRoot, target, collection);
    if (!page) continue;
    entries.push({
      node: { href: page.href, title: page.title, type: "doc" },
      position: page.sidebarPosition,
      title: page.title,
    });
  }
  return sortNavigation(entries);
}

function collectPages(locale: DocsLocale, collection: MarkdownCollection) {
  const localeRoot = path.join(collectionRoot(collection), locale);
  if (!existsSync(localeRoot)) return [];
  const pages: DocsPageData[] = [];

  function visit(directory: string) {
    for (const name of readdirSync(directory)) {
      if (name.startsWith(".") || name === "_category_.json") continue;
      const target = path.join(directory, name);
      if (statSync(target).isDirectory()) visit(target);
      else if (name.endsWith(".md")) {
        const page = pageFromFile(locale, localeRoot, target, collection);
        if (page) pages.push(page);
      }
    }
  }
  visit(localeRoot);
  return pages;
}

export function getDocsPages(locale: DocsLocale) {
  return collectPages(locale, "docs");
}

export function getDocsNavigation(locale: DocsLocale) {
  const localeRoot = path.join(collectionRoot("docs"), locale);
  return existsSync(localeRoot)
    ? readNavigationDirectory(locale, localeRoot, localeRoot, "docs")
    : [];
}

export function getDocsPage(locale: DocsLocale, slug: string) {
  const normalized = normalizeDocsSlug(slug);
  return getDocsPages(locale).find((page) => page.slug === normalized) ?? null;
}

export function getDocsLocalizedPage(slug: string) {
  const en = getDocsPage("en", slug);
  const ro = getDocsPage("ro", slug);
  return { en: en ?? ro, ro: ro ?? en };
}

export function getDocsStaticParams() {
  const slugs = new Set(
    ([...getDocsPages("en"), ...getDocsPages("ro")]).map((page) => page.slug),
  );
  return [...slugs].map((slug) => ({ slug: slug.split("/") }));
}

export function getExamplesPages(locale: DocsLocale) {
  return collectPages(locale, "examples");
}

export function getExamplesNavigation(locale: DocsLocale) {
  const localeRoot = path.join(collectionRoot("examples"), locale);
  return existsSync(localeRoot)
    ? readNavigationDirectory(locale, localeRoot, localeRoot, "examples")
    : [];
}

export function getExamplesPage(locale: DocsLocale, slug: string) {
  const normalized = normalizeDocsSlug(slug);
  return getExamplesPages(locale).find((page) => page.slug === normalized) ?? null;
}

export function getExamplesLocalizedPage(slug: string) {
  const en = getExamplesPage("en", slug);
  const ro = getExamplesPage("ro", slug);
  return { en: en ?? ro, ro: ro ?? en };
}

export function getExamplesStaticParams() {
  const slugs = new Set(
    ([...getExamplesPages("en"), ...getExamplesPages("ro")]).map(
      (page) => page.slug,
    ),
  );
  return [...slugs].map((slug) => ({ slug: slug.split("/") }));
}
