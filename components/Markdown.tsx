"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Separator } from "@/components/ui/separator";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
                  className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800"
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
            <thead className="border-b border-zinc-200 text-left">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-zinc-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
