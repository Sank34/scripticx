"use client";

import { useEffect, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Separator } from "@/components/ui/separator";
import {
  normalizeNoteImagePresentation,
  parseNoteImageTitle,
  type NoteImagePresentation,
} from "@/lib/note-image";
import {
  getWorkspaceImage,
  parseWorkspaceImageId,
} from "@/lib/workspace-assets";
import { cn } from "@/lib/utils";
import { slugifyLessonHeading } from "@/lib/lesson-markdown";

export function Markdown({
  children,
  className,
  eagerImages = false,
  headingAnchors = false,
  workspaceImageUserId,
}: {
  children: string;
  className?: string;
  eagerImages?: boolean;
  headingAnchors?: boolean;
  workspaceImageUserId?: string;
}) {
  return (
    <div className={cn("space-y-4 text-[15px] leading-7 text-foreground/80", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url, key, node) => {
          if (
            workspaceImageUserId &&
            key === "src" &&
            node.tagName === "img" &&
            parseWorkspaceImageId(url)
          ) {
            return url;
          }
          return defaultUrlTransform(url);
        }}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={headingAnchors ? slugifyLessonHeading(String(children)) : undefined}
              className="scroll-mt-24 mt-8 text-2xl font-semibold tracking-tight text-foreground"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={headingAnchors ? slugifyLessonHeading(String(children)) : undefined}
              className="scroll-mt-24 mt-6 text-lg font-semibold text-foreground"
            >
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-foreground/80">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
              className="text-foreground underline underline-offset-2 hover:text-foreground/75"
            >
              {children}
            </a>
          ),
          img: ({ alt, className, src, title }) => {
            const imageSource = typeof src === "string" ? src : undefined;
            const assetId = parseWorkspaceImageId(imageSource);
            const { ordinaryTitle, presentation } = parseNoteImageTitle(title);
            if (assetId && workspaceImageUserId) {
              return (
                <WorkspaceMarkdownImage
                  alt={alt || ""}
                  assetId={assetId}
                  eager={eagerImages}
                  ordinaryTitle={ordinaryTitle}
                  presentation={presentation}
                  userId={workspaceImageUserId}
                />
              );
            }
            if (!imageSource) return null;
            return (
              <MarkdownImageFrame presentation={presentation}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Markdown images can use arbitrary external URLs. */}
                <img
                  alt={alt || ""}
                  className={cn(
                    "block h-auto w-full max-w-full rounded-xl border bg-muted/20 object-contain shadow-sm",
                    className
                  )}
                  decoding="async"
                  data-note-image-alt={alt || ""}
                  data-note-image-source={imageSource}
                  loading={eagerImages ? "eager" : "lazy"}
                  referrerPolicy="no-referrer"
                  src={imageSource}
                  style={{
                    display: "block",
                    height: "auto",
                    margin: 0,
                    maxWidth: "100%",
                    width: presentation.widthPercent === null ? "auto" : "100%",
                  }}
                  title={ordinaryTitle || undefined}
                />
              </MarkdownImageFrame>
            );
          },
          ul: ({ children }) => (
            <ul className="ml-6 list-disc space-y-1.5 text-foreground/80">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-6 list-decimal space-y-1.5 text-foreground/80">
              {children}
            </ol>
          ),
          li: ({ children, className }) => <li className={className}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }: any) => {
            const isBlock =
              className?.startsWith("language-") ||
              String(children).includes("\n");
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-sm text-zinc-100" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-4 text-sm leading-6">
              {children}
            </pre>
          ),
          hr: () => <Separator className="my-8" />,
          table: ({ children }) => (
            <div
              className="note-scrollbar my-5 overflow-x-auto rounded-xl border border-border/80 bg-card/35"
              data-note-table-wrapper
            >
              <table className="min-w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/55 text-left">
              {children}
            </thead>
          ),
          th: ({ align, children, style }) => (
            <th
              className="min-w-32 border-b border-r border-border/75 px-3 py-2.5 font-semibold text-foreground last:border-r-0"
              style={{ ...style, textAlign: tableTextAlign(align) ?? style?.textAlign }}
            >
              {children}
            </th>
          ),
          td: ({ align, children, style }) => (
            <td
              className="min-w-32 border-b border-r border-border/65 px-3 py-2.5 align-top text-foreground/80 last:border-r-0"
              style={{ ...style, textAlign: tableTextAlign(align) ?? style?.textAlign }}
            >
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function tableTextAlign(value: unknown): React.CSSProperties["textAlign"] | undefined {
  return value === "center" || value === "left" || value === "right" ? value : undefined;
}

function WorkspaceMarkdownImage({
  alt,
  assetId,
  eager,
  ordinaryTitle,
  presentation,
  userId,
}: {
  alt: string;
  assetId: string;
  eager: boolean;
  ordinaryTitle: string | null;
  presentation: NoteImagePresentation;
  userId: string;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    setSource(null);

    void getWorkspaceImage(userId, assetId)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, userId]);

  if (failed) {
    return (
      <MarkdownImageFrame presentation={presentation}>
        <span
          className="flex min-h-24 min-w-40 w-full items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground"
          data-note-image-alt={alt}
          data-workspace-image-id={assetId}
          role="img"
        >
          {alt || "Image unavailable"}
        </span>
      </MarkdownImageFrame>
    );
  }

  if (!source) {
    return (
      <MarkdownImageFrame presentation={presentation}>
        <span
          aria-label={alt || "Loading image"}
          className="block h-40 min-w-40 w-full animate-pulse rounded-xl border bg-muted/40"
          data-note-image-alt={alt}
          data-workspace-image-id={assetId}
          role="img"
        />
      </MarkdownImageFrame>
    );
  }

  return (
    <MarkdownImageFrame presentation={presentation}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Local IndexedDB blobs do not have a Next image URL. */}
      <img
        alt={alt}
        className="block h-auto w-full max-w-full rounded-xl border bg-muted/20 object-contain shadow-sm"
        decoding="async"
        data-note-image-alt={alt}
        data-workspace-image-id={assetId}
        loading={eager ? "eager" : "lazy"}
        src={source}
        style={{
          display: "block",
          height: "auto",
          margin: 0,
          maxWidth: "100%",
          width: presentation.widthPercent === null ? "auto" : "100%",
        }}
        title={ordinaryTitle || undefined}
      />
    </MarkdownImageFrame>
  );
}

function MarkdownImageFrame({
  children,
  presentation: input,
}: {
  children: React.ReactNode;
  presentation: NoteImagePresentation;
}) {
  const presentation = normalizeNoteImagePresentation(input);
  return (
    <span
      className={cn(
        "my-5 flex w-full",
        presentation.align === "left" && "justify-start",
        presentation.align === "center" && "justify-center",
        presentation.align === "right" && "justify-end"
      )}
      style={{
        display: "flex",
        justifyContent:
          presentation.align === "left"
            ? "flex-start"
            : presentation.align === "right"
              ? "flex-end"
              : "center",
        margin: "1.25rem 0",
        width: "100%",
      }}
    >
      <span
        className={cn(
          "block max-w-full",
          presentation.widthPercent !== null && "min-w-[20%]"
        )}
        style={{
          display: "block",
          maxWidth: "100%",
          minWidth: presentation.widthPercent === null ? undefined : "20%",
          opacity: presentation.opacity / 100,
          width:
            presentation.widthPercent === null
              ? "fit-content"
              : `${presentation.widthPercent}%`,
        }}
      >
        {children}
      </span>
    </span>
  );
}
