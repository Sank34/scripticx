"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type HighlightedCodeBlockProps = {
  code: string;
  copyLabel?: string;
  languageLabel?: string;
};

type TokenKind =
  | "comment"
  | "keyword"
  | "number"
  | "operator"
  | "string"
  | "text";

type CodeToken = {
  kind: TokenKind;
  value: string;
};

const KEYWORDS = new Set([
  "AND",
  "DIV",
  "ELSE",
  "END",
  "FALSE",
  "FOR",
  "IF",
  "INPUT",
  "MOD",
  "NOT",
  "OR",
  "PRINT",
  "STEP",
  "THEN",
  "TO",
  "TRUE",
  "WHILE",
]);

const FUNCTIONS = new Set([
  "ABS",
  "CEIL",
  "FLOOR",
  "INT",
  "MAX",
  "MIN",
  "ROUND",
  "SQRT",
  "TRUNC",
]);

function getTokenClass(kind: TokenKind) {
  switch (kind) {
    case "comment":
      return "text-emerald-400 italic";
    case "keyword":
      return "text-violet-300 font-semibold";
    case "number":
      return "text-cyan-300";
    case "operator":
      return "text-zinc-300";
    case "string":
      return "text-orange-300";
    default:
      return "text-zinc-100";
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

    const operatorMatch = line
      .slice(index)
      .match(/^(<=|>=|==|!=|[+\-*/%=<>(){},])/);
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

export function HighlightedCodeBlock({
  code,
  copyLabel = "Copy",
  languageLabel = "MiniScript+",
}: HighlightedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\s+$/, "").split("\n");

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied");

    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-sm shadow-sm"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-2 text-xs font-medium text-zinc-400">
            {languageLabel}
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={handleCopy}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : copyLabel}
        </Button>
      </div>

      <pre className="code-block-scroll max-h-[280px] overflow-auto p-0 font-mono text-[13px] leading-6">
        <code>
          {lines.map((line, lineIndex) => (
            <span
              key={`${lineIndex}-${line}`}
              className="grid grid-cols-[3rem_minmax(0,1fr)] border-b border-zinc-900/60 last:border-b-0"
            >
              <span className="select-none bg-zinc-900/40 px-3 text-right text-zinc-600">
                {lineIndex + 1}
              </span>
              <span className="whitespace-pre px-3">
                {tokenizeLine(line).map((token, tokenIndex) => (
                  <span
                    key={`${tokenIndex}-${token.value}`}
                    className={getTokenClass(token.kind)}
                  >
                    {token.value}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </code>
      </pre>

      <style jsx>{`
        .code-block-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .code-block-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
