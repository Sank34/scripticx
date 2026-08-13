"use client";

import { useEffect, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Separator } from "@/components/ui/separator";
import {
  getWorkspaceImage,
  parseWorkspaceImageId,
} from "@/lib/workspace-assets";
import { cn } from "@/lib/utils";

export function Markdown({
  children,
  workspaceImageUserId,
}: {
  children: string;
  workspaceImageUserId?: string;
}) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground/80">
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
            <h2 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-lg font-semibold text-foreground">
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
          img: ({ alt, className, src }) => {
            const imageSource = typeof src === "string" ? src : undefined;
            const assetId = parseWorkspaceImageId(imageSource);
            if (assetId && workspaceImageUserId) {
              return (
                <WorkspaceMarkdownImage
                  alt={alt || ""}
                  assetId={assetId}
                  userId={workspaceImageUserId}
                />
              );
            }
            if (!imageSource) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element -- Markdown images can use arbitrary external URLs.
              <img
                alt={alt || ""}
                className={cn(
                  "my-5 h-auto max-h-[36rem] max-w-full rounded-xl border bg-muted/20 object-contain",
                  className
                )}
                decoding="async"
                loading="lazy"
                referrerPolicy="no-referrer"
                src={imageSource}
              />
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
          li: ({ children }) => <li>{children}</li>,
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b text-left">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b px-3 py-2 text-foreground/80">
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

function WorkspaceMarkdownImage({
  alt,
  assetId,
  userId,
}: {
  alt: string;
  assetId: string;
  userId: string;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

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
      <span className="my-4 flex min-h-24 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground">
        {alt || "Image unavailable"}
      </span>
    );
  }

  if (!source) {
    return (
      <span
        aria-label={alt || "Loading image"}
        className="my-4 block h-40 animate-pulse rounded-xl border bg-muted/40"
        role="img"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Local IndexedDB blobs do not have a Next image URL.
    <img
      alt={alt}
      className="my-5 h-auto max-h-[36rem] max-w-full rounded-xl border bg-muted/20 object-contain"
      decoding="async"
      src={source}
    />
  );
}
