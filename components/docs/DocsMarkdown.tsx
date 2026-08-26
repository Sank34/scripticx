"use client";

import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { OpenCodeInEditorButton } from "@/components/docs/OpenCodeInEditorButton";
import { useLanguage } from "@/components/LanguageProvider";
import { Separator } from "@/components/ui/separator";
import {
  prepareDocsMarkdown,
  slugifyDocsHeading,
} from "@/lib/docs-content";
import {
  findNoteCodeLanguage,
  getNoteCodeLanguageLabel,
} from "@/lib/note-code-languages";
import type { EditorLanguageKey } from "@/lib/editor-project";
import { cn } from "@/lib/utils";

type MarkdownAstNode = {
  children?: MarkdownAstNode[];
  data?: { hProperties?: Record<string, unknown> };
  meta?: string;
  type?: string;
};

function remarkDocsCodeMetadata() {
  return (tree: MarkdownAstNode) => {
    function visit(node: MarkdownAstNode) {
      if (node.type === "code" && node.meta) {
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties["data-code-meta"] = node.meta;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

const EDITOR_LANGUAGE_ALIASES: Record<string, EditorLanguageKey> = {
  bash: "shell",
  c: "c",
  "c#": "csharp",
  "c++": "cpp",
  cpp: "cpp",
  cs: "csharp",
  csharp: "csharp",
  css: "css",
  go: "go",
  html: "html",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascriptreact",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  miniscript: "msp",
  miniscriptplus: "msp",
  msp: "msp",
  plaintext: "text",
  py: "python",
  python: "python",
  rs: "rust",
  rust: "rust",
  sass: "scss",
  scss: "scss",
  sh: "shell",
  shell: "shell",
  sql: "sql",
  text: "text",
  ts: "typescript",
  tsx: "typescriptreact",
  typescript: "typescript",
  yaml: "yaml",
  yml: "yaml",
};

function reactText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return reactText(child.props.children);
      }
      return "";
    })
    .join("");
}

function docsLanguage(language: string | undefined) {
  const normalized = language?.trim().toLocaleLowerCase() || "plaintext";
  return EDITOR_LANGUAGE_ALIASES[normalized] ?? "text";
}

function codeBlockOptions(meta: string | undefined) {
  const title = meta?.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
  return {
    fileName: title?.[1] || title?.[2] || title?.[3],
    showLineNumbers: !/(?:^|\s)(?:noLineNumbers|hideLineNumbers)(?:\s|$)/i.test(meta ?? ""),
  };
}

function stripAdmonitionMarker(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children);
  let changed = false;
  const next = nodes.map((child) => {
    if (changed) return child;
    if (typeof child === "string") {
      const clean = child.replace(
        /^\s*\[!(NOTE|TIP|INFO|WARNING|DANGER)\]\s*/i,
        "",
      );
      changed = clean !== child;
      return clean;
    }
    if (isValidElement<{ children?: ReactNode }>(child)) {
      const cleanChildren = stripAdmonitionMarker(child.props.children);
      if (reactText(cleanChildren) !== reactText(child.props.children)) {
        changed = true;
        return cloneElement(child, undefined, cleanChildren);
      }
    }
    return child;
  });
  return next;
}

export function DocsMarkdown({
  content,
  openInEditor = true,
  sourceTitle,
}: {
  content: string;
  openInEditor?: boolean;
  sourceTitle?: string;
}) {
  const { locale } = useLanguage();
  const headingIds = new Map<string, number>();

  function headingId(children: ReactNode) {
    const base = slugifyDocsHeading(reactText(children));
    const occurrence = headingIds.get(base) ?? 0;
    headingIds.set(base, occurrence + 1);
    return occurrence === 0 ? base : `${base}-${occurrence + 1}`;
  }

  function Heading({
    children,
    depth,
  }: {
    children: ReactNode;
    depth: 1 | 2 | 3 | 4 | 5 | 6;
  }) {
    const id = headingId(children);
    const Tag = `h${depth}` as keyof React.JSX.IntrinsicElements;
    return (
      <Tag
        id={id}
        className={cn(
          "group scroll-mt-24 font-heading font-semibold text-foreground",
          depth === 1 && "mt-10 text-3xl leading-tight first:mt-0",
          depth === 2 && "mt-12 border-b border-border/70 pb-3 text-2xl leading-tight",
          depth === 3 && "mt-9 text-xl leading-snug",
          depth === 4 && "mt-7 text-lg leading-snug",
          depth >= 5 && "mt-6 text-base leading-snug",
        )}
      >
        <a className="no-underline" href={`#${id}`}>
          {children}
          <span
            aria-hidden="true"
            className="ml-2 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
          >
            #
          </span>
        </a>
      </Tag>
    );
  }

  return (
    <div className="docs-markdown min-w-0 text-[15px] leading-7 text-foreground/82">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDocsCodeMetadata]}
        urlTransform={defaultUrlTransform}
        components={{
          h1: ({ children }) => <Heading depth={1}>{children}</Heading>,
          h2: ({ children }) => <Heading depth={2}>{children}</Heading>,
          h3: ({ children }) => <Heading depth={3}>{children}</Heading>,
          h4: ({ children }) => <Heading depth={4}>{children}</Heading>,
          h5: ({ children }) => <Heading depth={5}>{children}</Heading>,
          h6: ({ children }) => <Heading depth={6}>{children}</Heading>,
          p: ({ children }) => {
            const kind = reactText(children)
              .trimStart()
              .match(/^\[!(NOTE|TIP|INFO|WARNING|DANGER)\]/i)?.[1]
              ?.toLowerCase();
            return (
              <p
                className={cn("my-4 text-pretty", kind && "font-medium text-foreground")}
                data-docs-admonition={kind}
              >
                {kind ? stripAdmonitionMarker(children) : children}
              </p>
            );
          },
          a: ({ children, href }) => {
            const external = href?.startsWith("http://") || href?.startsWith("https://");
            const className =
              "font-medium text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-foreground";
            if (!href || external || href.startsWith("#")) {
              return (
                <a
                  className={className}
                  href={href}
                  rel={external ? "noreferrer" : undefined}
                  target={external ? "_blank" : undefined}
                >
                  {children}
                </a>
              );
            }
            return <Link className={className} href={href}>{children}</Link>;
          },
          img: ({ alt, src, title }) => {
            if (typeof src !== "string") return null;
            return (
              <figure className="my-8">
                {/* eslint-disable-next-line @next/next/no-img-element -- Documentation accepts local and remote author-provided images. */}
                <img
                  alt={alt || ""}
                  className="sx-surface mx-auto block h-auto max-h-[680px] max-w-full bg-muted/20 object-contain"
                  decoding="async"
                  loading="lazy"
                  src={src}
                />
                {(title || alt) && (
                  <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                    {title || alt}
                  </figcaption>
                )}
              </figure>
            );
          },
          ul: ({ children, className }) => (
            <ul
              className={cn(
                "my-4 ml-5 list-disc space-y-2 marker:text-muted-foreground",
                className?.includes("contains-task-list") && "ml-0 list-none",
              )}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-5 list-decimal space-y-2 marker:font-medium marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children, className }) => (
            <li
              className={cn(
                "pl-1",
                className?.includes("task-list-item") && "flex items-start gap-2 pl-0",
              )}
            >
              {children}
            </li>
          ),
          input: ({ type, checked }) =>
            type === "checkbox" ? (
              <input
                checked={checked}
                className="mt-1.5 size-4 accent-foreground"
                disabled
                type="checkbox"
              />
            ) : null,
          blockquote: ({ children }) => {
            const first = Children.toArray(children)[0];
            const kind = isValidElement<{ "data-docs-admonition"?: string }>(first)
              ? first.props["data-docs-admonition"]
              : undefined;
            return (
              <blockquote
                className={cn(
                  "my-6 rounded-[var(--sx-radius-card)] border border-border bg-muted/35 px-5 py-1 text-foreground/78",
                  kind === "tip" && "border-[color:var(--sx-success)]/35 bg-[color:var(--sx-success-soft)]/35",
                  (kind === "warning" || kind === "danger") &&
                    "border-[color:var(--sx-warning)]/35 bg-[color:var(--sx-warning-soft)]/35",
                  kind === "info" && "border-[color:var(--sx-info)]/35 bg-[color:var(--sx-info-soft)]/35",
                )}
              >
                {children}
              </blockquote>
            );
          },
          code: ({ children, className }) => (
            <code
              className={cn(
                "rounded-md border border-border/70 bg-muted/55 px-1.5 py-0.5 font-mono text-[0.88em] text-foreground",
                className,
              )}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => {
            const child = Children.toArray(children)[0] as ReactElement<{
              children?: ReactNode;
              className?: string;
              "data-code-meta"?: string;
            }> | undefined;
            const className = isValidElement(child) ? child.props.className : undefined;
            const meta = isValidElement(child) ? child.props["data-code-meta"] : undefined;
            const rawLanguage = className?.match(/language-([^\s]+)/)?.[1];
            const code = isValidElement(child)
              ? reactText(child.props.children).replace(/\n$/, "")
              : reactText(children).replace(/\n$/, "");
            const editorLanguage = docsLanguage(rawLanguage);
            const languageDefinition = findNoteCodeLanguage(rawLanguage || "plaintext");
            const options = codeBlockOptions(meta);
            return (
              <div className="my-7">
                <HighlightedCodeBlock
                  code={code}
                  copiedLabel={locale === "ro" ? "Cod copiat" : "Code copied"}
                  copyErrorLabel={locale === "ro" ? "Codul nu a putut fi copiat" : "Could not copy code"}
                  copyLabel={locale === "ro" ? "Copiază codul" : "Copy code"}
                  emptyLabel={locale === "ro" ? "Bloc de cod gol" : "Empty code block"}
                  fileName={options.fileName}
                  language={editorLanguage}
                  languageLabel={
                    languageDefinition?.label || getNoteCodeLanguageLabel(rawLanguage)
                  }
                  showLineNumbers={options.showLineNumbers && code.includes("\n")}
                />
                {openInEditor && code.trim() && (
                  <div className="mt-2 flex justify-end">
                    <OpenCodeInEditorButton
                      code={code}
                      fileName={options.fileName}
                      label={locale === "ro" ? "Deschide în editor" : "Open in editor"}
                      language={editorLanguage}
                      sourceTitle={sourceTitle}
                    />
                  </div>
                )}
              </div>
            );
          },
          hr: () => <Separator className="my-10" />,
          table: ({ children }) => (
            <div className="my-7 overflow-x-auto rounded-[var(--sx-radius-card)] border border-border">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/55 text-left">{children}</thead>,
          th: ({ children, style }) => (
            <th className="border-b border-r border-border px-4 py-3 font-semibold text-foreground last:border-r-0" style={style}>
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td className="border-b border-r border-border/70 px-4 py-3 align-top last:border-r-0" style={style}>
              {children}
            </td>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="text-foreground/82">{children}</em>,
          del: ({ children }) => <del className="text-muted-foreground decoration-muted-foreground">{children}</del>,
        }}
      >
        {prepareDocsMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
