"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Network, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  parseGraphInput,
  type GraphParseIssue,
  type ParsedGraphEdge,
  type ParsedGraphNode,
} from "@/lib/graph-parser";

export type QuickGraphDefinition = {
  directed: boolean;
  edges: ParsedGraphEdge[];
  nodes: ParsedGraphNode[];
};

type QuickGraphPopoverProps = {
  disabled?: boolean;
  language: "en" | "ro";
  onGenerate: (graph: QuickGraphDefinition) => Promise<void>;
};

const quickCopy = {
  en: {
    advanced: "Advanced settings",
    description: "One edge per line. Use labels, numbers, or arrows.",
    directed: "Directed graph",
    empty: "Add at least one edge.",
    generate: "Generate on whiteboard",
    placeholder: "A B\nB C\nC A",
    title: "Quick graph",
    trigger: "Quick graph",
  },
  ro: {
    advanced: "Setări avansate",
    description: "O muchie pe linie. Poți folosi etichete, numere sau săgeți.",
    directed: "Graf orientat",
    empty: "Adaugă cel puțin o muchie.",
    generate: "Generează în whiteboard",
    placeholder: "A B\nB C\nC A",
    title: "Graf rapid",
    trigger: "Graf rapid",
  },
} as const;

function stripComment(value: string) {
  let quote: "\"" | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote) {
      escaped = true;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = quote === character ? null : quote || character;
      continue;
    }
    if (!quote && character === "#") return value.slice(0, index);
    if (!quote && character === "/" && value[index + 1] === "/") {
      return value.slice(0, index);
    }
  }
  return value;
}

function lineTokens(value: string) {
  const clean = stripComment(value)
    .replace(/<->|-->|->|--|—|–/g, " ")
    .trim();
  const tokens: string[] = [];
  const matcher = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(clean))) {
    const token = (match[1] ?? match[2] ?? match[3] ?? "")
      .replace(/\\([\\"'])/g, "$1")
      .trim();
    if (token) tokens.push(token);
  }
  return tokens;
}

function issueMessage(issue: GraphParseIssue, language: "en" | "ro") {
  const line = issue.line ? (language === "ro" ? ` la linia ${issue.line}` : ` on line ${issue.line}`) : "";
  if (issue.code === "invalid-edge-format") {
    return language === "ro"
      ? `Fiecare linie trebuie să conțină exact două noduri${line}.`
      : `Each line must contain exactly two nodes${line}.`;
  }
  if (issue.code === "invalid-node-reference") {
    return language === "ro"
      ? `Nod necunoscut „${issue.value || ""}”${line}.`
      : `Unknown node “${issue.value || ""}”${line}.`;
  }
  if (issue.code === "too-many-nodes") {
    return language === "ro" ? "Folosește maximum 250 de noduri." : "Use at most 250 nodes.";
  }
  return language === "ro" ? "Verifică datele grafului." : "Check the graph data.";
}

function parseQuickGraph(edgeList: string, directed: boolean) {
  const rows = edgeList
    .split(/\r?\n/)
    .map((line) => lineTokens(line))
    .filter((tokens) => tokens.length > 0);
  const labels = Array.from(new Set(rows.flat()));
  const numericLabels = labels.every((label) => /^(0|[1-9]\d*)$/.test(label));
  const numbers = numericLabels ? labels.map(Number) : [];
  const indexMode = numericLabels && numbers.includes(0) ? "zero" : numericLabels ? "one" : "custom";
  const nodeCount = numericLabels
    ? numbers.reduce(
        (maximum, value) => Math.max(maximum, value),
        indexMode === "zero" ? 0 : 1
      ) + (indexMode === "zero" ? 1 : 0)
    : labels.length;

  return parseGraphInput({
    customLabels: indexMode === "custom" ? labels : undefined,
    directed,
    edgeList,
    indexMode,
    nodeCount,
  });
}

export function QuickGraphPopover({
  disabled = false,
  language,
  onGenerate,
}: QuickGraphPopoverProps) {
  const c = quickCopy[language];
  const [open, setOpen] = useState(false);
  const [edgeList, setEdgeList] = useState("");
  const [directed, setDirected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!edgeList.trim()) {
      setError(c.empty);
      return;
    }
    const graph = parseQuickGraph(edgeList, directed);
    if (!graph.isValid) {
      setError(issueMessage(graph.errors[0], language));
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await onGenerate({ directed: graph.directed, edges: graph.edges, nodes: graph.nodes });
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : language === "ro" ? "Graful nu a putut fi creat." : "Could not create the graph.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} size="sm" variant="ghost">
          <Network />
          {c.trigger}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(23rem,calc(100vw-1rem))] gap-4 p-4" sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            {c.title}
          </PopoverTitle>
          <PopoverDescription className="text-xs leading-5">{c.description}</PopoverDescription>
        </PopoverHeader>

        <Textarea
          aria-label={c.description}
          autoFocus
          className="min-h-32 resize-y font-mono text-sm leading-6"
          onChange={(event) => {
            setEdgeList(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void generate();
            }
          }}
          placeholder={c.placeholder}
          value={edgeList}
        />

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
          <label className="cursor-pointer text-xs font-medium" htmlFor="quick-graph-directed">
            {c.directed}
          </label>
          <Switch
            checked={directed}
            id="quick-graph-directed"
            onCheckedChange={setDirected}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button asChild className="px-0" size="sm" variant="link">
            <Link href="/workspace/student/graph">
              {c.advanced}
              <ArrowUpRight />
            </Link>
          </Button>
          <Button disabled={generating || !edgeList.trim()} onClick={() => void generate()} size="sm">
            {generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {c.generate}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
