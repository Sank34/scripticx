export type DocsLocale = "en" | "ro";
export type MarkdownCollection = "docs" | "examples";

export type DocsFrontmatter = {
  title: string;
  description: string;
  sidebarPosition: number;
  slug?: string;
  draft: boolean;
  keywords: string[];
};

export type DocsHeading = {
  depth: number;
  id: string;
  title: string;
};

export type DocsPageData = {
  content: string;
  description: string;
  headings: DocsHeading[];
  href: string;
  keywords: string[];
  locale: DocsLocale;
  sidebarPosition: number;
  slug: string;
  title: string;
};

export type DocsNavigationItem = {
  href: string;
  title: string;
  type: "doc";
};

export type DocsNavigationGroup = {
  collapsed: boolean;
  description?: string;
  items: DocsNavigationNode[];
  title: string;
  type: "group";
};

export type DocsNavigationNode = DocsNavigationItem | DocsNavigationGroup;

export function flattenDocsNavigation(nodes: DocsNavigationNode[]) {
  const pages: DocsNavigationItem[] = [];
  for (const node of nodes) {
    if (node.type === "doc") pages.push(node);
    else pages.push(...flattenDocsNavigation(node.items));
  }
  return pages;
}

export type ParsedDocsMarkdown = {
  content: string;
  frontmatter: DocsFrontmatter;
  headings: DocsHeading[];
};

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

function unquote(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\([\\"'])/g, "$1");
  }
  return trimmed;
}

function parseList(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return trimmed ? [unquote(trimmed)] : [];
  }
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => unquote(item))
    .filter(Boolean);
}

function parseFrontmatterBlock(source: string) {
  const values: Record<string, string> = {};
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

export function slugifyDocsHeading(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";
}

export function markdownText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function extractDocsHeadings(content: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  const usedIds = new Map<string, number>();
  let fence: string | null = null;

  for (const line of content.split("\n")) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;

    const match = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const title = markdownText(match[2]);
    if (!title) continue;
    const baseId = slugifyDocsHeading(title);
    const occurrence = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, occurrence + 1);
    headings.push({
      depth: match[1].length,
      id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
      title,
    });
  }
  return headings;
}

/**
 * Converts the familiar Docusaurus admonition syntax into GFM blockquotes.
 * The renderer recognizes the generated `[!TYPE]` marker and displays a
 * semantic ScripticX callout without enabling raw HTML in documentation.
 */
export function prepareDocsMarkdown(content: string) {
  const lines = content.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const start = lines[index].match(
      /^:::(note|tip|info|warning|danger)(?:\[([^\]]+)\])?\s*$/i,
    );
    if (!start) {
      output.push(lines[index]);
      continue;
    }

    const body: string[] = [];
    index += 1;
    while (index < lines.length && !/^:::\s*$/.test(lines[index])) {
      body.push(lines[index]);
      index += 1;
    }
    const title = start[2]?.trim();
    output.push(`> [!${start[1].toUpperCase()}]${title ? ` ${title}` : ""}`);
    output.push("> ");
    output.push(...body.map((line) => `> ${line}`));
  }
  return output.join("\n");
}

export function parseDocsMarkdown(source: string): ParsedDocsMarkdown {
  const normalizedSource = source.replace(/\r\n?/g, "\n");
  const match = normalizedSource.match(FRONTMATTER_PATTERN);
  const values = match ? parseFrontmatterBlock(match[1]) : {};
  const content = (
    match ? normalizedSource.slice(match[0].length) : normalizedSource
  ).trim();
  const position = Number(values.sidebar_position ?? values.sidebarPosition);

  return {
    content,
    frontmatter: {
      title: unquote(values.title ?? "Untitled document"),
      description: unquote(values.description ?? ""),
      sidebarPosition: Number.isFinite(position) ? position : 999,
      slug: values.slug ? unquote(values.slug) : undefined,
      draft: values.draft === "true",
      keywords: parseList(values.keywords ?? ""),
    },
    headings: extractDocsHeadings(content),
  };
}

export function normalizeDocsSlug(value: string | string[] | undefined) {
  const source = Array.isArray(value) ? value.join("/") : value ?? "";
  return source
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?docs\/?/i, "")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}
