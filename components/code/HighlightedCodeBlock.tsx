"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditorLanguageKey } from "@/lib/editor-project";
import { noteCodeLowlight } from "@/lib/note-code-highlight";

type HighlightedCodeBlockProps = {
  code: string;
  copiedLabel?: string;
  copyErrorLabel?: string;
  copyLabel?: string;
  emptyLabel?: string;
  fileName?: string;
  language?: EditorLanguageKey;
  languageLabel?: string;
  showLineNumbers?: boolean;
};

type TokenKind = "comment" | "keyword" | "number" | "operator" | "string" | "text";
type CodeToken = { kind: TokenKind; value: string };
type HighlightNode =
  | { type: "text"; value: string }
  | {
      type: "element";
      properties?: { className?: string[] | string };
      children?: HighlightNode[];
    };
type HighlightSegment = { className?: string; value: string };

const KEYWORDS = new Set([
  "AND", "DIV", "ELSE", "END", "FALSE", "FOR", "IF", "INPUT", "MOD",
  "NOT", "OR", "PRINT", "STEP", "THEN", "TO", "TRUE", "WHILE",
]);
const FUNCTIONS = new Set([
  "ABS", "CEIL", "FLOOR", "INT", "MAX", "MIN", "ROUND", "SQRT", "TRUNC",
]);

const LOWLIGHT_LANGUAGE: Partial<Record<EditorLanguageKey, string>> = {
  c: "c", cpp: "cpp", csharp: "csharp", css: "css", go: "go", html: "html",
  java: "java", javascript: "javascript", javascriptreact: "javascript",
  json: "json", markdown: "markdown", msp: "miniscript", python: "python",
  rust: "rust", scss: "scss", shell: "bash", sql: "sql",
  typescript: "typescript", typescriptreact: "typescript", yaml: "yaml",
};

const LANGUAGE_MARK: Partial<Record<EditorLanguageKey, string>> = {
  c: "C", cpp: "C++", csharp: "C#", css: "CSS", go: "GO", html: "HTML",
  java: "JV", javascript: "JS", javascriptreact: "JSX", json: "{}",
  markdown: "MD", msp: "MS+", python: "PY", rust: "RS", scss: "SCSS",
  shell: ">_", sql: "SQL", text: "TXT", typescript: "TS",
  typescriptreact: "TSX", yaml: "YML",
};

function getTokenClass(kind: TokenKind) {
  switch (kind) {
    case "comment": return "text-[#7f9f71] italic";
    case "keyword": return "font-medium text-[#c8a0df]";
    case "number": return "text-[#8dcbd1]";
    case "operator": return "text-[#b5b5ba]";
    case "string": return "text-[#d9a875]";
    default: return "text-[#e8e8e8]";
  }
}

function tokenizeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let index = 0;

  while (index < line.length) {
    const char = line[index];
    if (char === "#") {
      tokens.push({ kind: "comment", value: line.slice(index) });
      break;
    }
    if (char === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '"' && line[end - 1] !== "\\") {
          end += 1;
          break;
        }
        end += 1;
      }
      tokens.push({ kind: "string", value: line.slice(index, end) });
      index = end;
      continue;
    }

    const numberMatch = line.slice(index).match(/^\d+(?:\.\d+)?/);
    if (numberMatch) {
      tokens.push({ kind: "number", value: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }
    const wordMatch = line.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (wordMatch) {
      const value = wordMatch[0];
      const upper = value.toUpperCase();
      tokens.push({
        kind: KEYWORDS.has(upper) || FUNCTIONS.has(upper) ? "keyword" : "text",
        value,
      });
      index += value.length;
      continue;
    }
    const operatorMatch = line.slice(index).match(/^(<=|>=|==|!=|[+\-*/%=<>(){},])/);
    if (operatorMatch) {
      tokens.push({ kind: "operator", value: operatorMatch[0] });
      index += operatorMatch[0].length;
      continue;
    }
    tokens.push({ kind: "text", value: char });
    index += 1;
  }
  return tokens;
}

function nodeClasses(node: Extract<HighlightNode, { type: "element" }>) {
  const className = node.properties?.className;
  if (Array.isArray(className)) return className;
  return className ? [className] : [];
}

function flattenHighlightNodes(
  nodes: HighlightNode[],
  inheritedClasses: string[] = [],
): HighlightSegment[] {
  return nodes.flatMap((node) => {
    if (node.type === "text") {
      return [{
        value: node.value,
        className: inheritedClasses.length ? inheritedClasses.join(" ") : undefined,
      }];
    }
    return flattenHighlightNodes(
      node.children ?? [],
      [...inheritedClasses, ...nodeClasses(node)],
    );
  });
}

function splitSegmentsIntoLines(segments: HighlightSegment[]) {
  const lines: HighlightSegment[][] = [[]];
  for (const segment of segments) {
    const parts = segment.value.replace(/\r\n?/g, "\n").split("\n");
    parts.forEach((part, index) => {
      if (part) lines.at(-1)!.push({ ...segment, value: part });
      if (index < parts.length - 1) lines.push([]);
    });
  }
  return lines;
}

function renderLine(line: HighlightSegment[], lineIndex: number): ReactNode {
  if (line.length === 0) return <span aria-hidden="true">&#8203;</span>;
  return line.map((segment, segmentIndex) => (
    <span key={`${lineIndex}-${segmentIndex}`} className={segment.className}>
      {segment.value}
    </span>
  ));
}

export function HighlightedCodeBlock({
  code,
  copiedLabel = "Copied",
  copyErrorLabel = "Could not copy code",
  copyLabel = "Copy code",
  emptyLabel = "Empty file",
  fileName,
  language = "msp",
  languageLabel = "MiniScript+",
  showLineNumbers = true,
}: HighlightedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const normalizedCode = code.replace(/\r\n?/g, "\n");
  const languageMark = LANGUAGE_MARK[language] ?? "<>";

  const lines = useMemo(() => {
    const lowlightLanguage = LOWLIGHT_LANGUAGE[language];
    if (lowlightLanguage && language !== "msp") {
      try {
        const tree = noteCodeLowlight.highlight(lowlightLanguage, normalizedCode)
          .children as HighlightNode[];
        return splitSegmentsIntoLines(flattenHighlightNodes(tree));
      } catch {
        // Plain text below is intentionally retained as a safe fallback.
      }
    }

    return normalizedCode.split("\n").map((line) => {
      if (language !== "msp") return [{ value: line }];
      return tokenizeLine(line).map((token) => ({
        value: token.value,
        className: getTokenClass(token.kind),
      }));
    });
  }, [language, normalizedCode]);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(copiedLabel);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(copyErrorLabel);
    }
  }

  return (
    <div
      className="sx-code-block overflow-hidden rounded-[var(--sx-radius-card)] border border-white/10 bg-[#101011] text-sm text-[#e8e8e8]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex h-10 min-w-0 items-center justify-between gap-3 border-b border-white/8 bg-[#171718] px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-5 min-w-5 place-items-center rounded-[5px] border border-white/10 bg-white/6 px-1 font-mono text-[9px] font-semibold text-[#b8b8bd]"
          >
            {languageMark}
          </span>
          <span className="truncate font-mono text-xs text-[#a7a7ac]" title={fileName}>
            {fileName || languageLabel}
          </span>
          {fileName && (
            <span className="hidden text-xs text-[#717178] sm:inline">{languageLabel}</span>
          )}
        </div>

        <TooltipProvider delayDuration={240}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="shrink-0 text-[#929298] hover:bg-white/8 hover:text-white"
                onClick={handleCopy}
                aria-label={copied ? copiedLabel : copyLabel}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{copied ? copiedLabel : copyLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {normalizedCode.length === 0 ? (
        <div className="px-4 py-8 text-center font-mono text-xs text-[#77777d]">
          {emptyLabel}
        </div>
      ) : (
        <pre
          className="code-block-scroll max-h-[min(620px,70vh)] overflow-auto py-3 font-mono text-[13px] leading-6 [tab-size:2]"
          tabIndex={0}
          aria-label={`${languageLabel} code`}
        >
          <code className="block min-w-max">
            {lines.map((line, lineIndex) => (
              <span
                key={lineIndex}
                className={showLineNumbers ? "grid grid-cols-[3.5rem_minmax(0,1fr)]" : "block"}
              >
                {showLineNumbers && (
                  <span
                    aria-hidden="true"
                    className="sticky left-0 z-[1] select-none bg-[#101011] pr-4 text-right text-[#616167]"
                  >
                    {lineIndex + 1}
                  </span>
                )}
                <span className="whitespace-pre pr-6">{renderLine(line, lineIndex)}</span>
              </span>
            ))}
          </code>
        </pre>
      )}

      <style jsx>{`
        .code-block-scroll {
          scrollbar-color: #3f3f44 transparent;
          scrollbar-width: thin;
        }
        .code-block-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .code-block-scroll::-webkit-scrollbar-thumb {
          border: 3px solid transparent;
          border-radius: 999px;
          background: #3f3f44;
          background-clip: padding-box;
        }
      `}</style>
      <style jsx global>{`
        .sx-code-block .hljs-comment, .sx-code-block .hljs-quote {
          color: #7f9f71; font-style: italic;
        }
        .sx-code-block .hljs-keyword, .sx-code-block .hljs-selector-tag,
        .sx-code-block .hljs-built_in, .sx-code-block .hljs-type { color: #c8a0df; }
        .sx-code-block .hljs-string, .sx-code-block .hljs-attr,
        .sx-code-block .hljs-template-tag, .sx-code-block .hljs-template-variable { color: #d9a875; }
        .sx-code-block .hljs-number, .sx-code-block .hljs-literal,
        .sx-code-block .hljs-symbol, .sx-code-block .hljs-bullet { color: #8dcbd1; }
        .sx-code-block .hljs-title, .sx-code-block .hljs-section,
        .sx-code-block .hljs-function .hljs-title { color: #82b4d8; }
        .sx-code-block .hljs-variable, .sx-code-block .hljs-params,
        .sx-code-block .hljs-property { color: #e2e2e5; }
        .sx-code-block .hljs-meta, .sx-code-block .hljs-meta .hljs-keyword { color: #d5bd85; }
        .sx-code-block .hljs-deletion { color: #e39b9b; }
        .sx-code-block .hljs-addition { color: #91bc89; }
      `}</style>
    </div>
  );
}
