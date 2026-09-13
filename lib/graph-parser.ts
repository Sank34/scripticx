export type GraphIndexMode = "zero" | "one" | "custom";

export type GraphIssueCode =
  | "invalid-node-count"
  | "too-many-nodes"
  | "custom-labels-required"
  | "custom-label-count-mismatch"
  | "duplicate-label"
  | "invalid-edge-format"
  | "invalid-node-reference"
  | "duplicate-edge"
  | "self-loop";

export type GraphParseIssue = {
  code: GraphIssueCode;
  line?: number;
  value?: string;
};

export type ParsedGraphNode = {
  id: string;
  index: number;
  label: string;
};

export type ParsedGraphEdge = {
  id: string;
  line: number;
  source: string;
  target: string;
};

export type ParseGraphInput = {
  customLabels?: string | string[];
  directed: boolean;
  edgeList: string;
  indexMode: GraphIndexMode;
  nodeCount: number;
};

export type ParsedGraph = {
  directed: boolean;
  edges: ParsedGraphEdge[];
  errors: GraphParseIssue[];
  isValid: boolean;
  nodes: ParsedGraphNode[];
  warnings: GraphParseIssue[];
};

const MAX_NODE_COUNT = 250;

function unescapeQuotedToken(value: string) {
  return value.replace(/\\([\\"'])/g, "$1");
}

function tokenize(value: string) {
  const tokens: string[] = [];
  const matcher = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s,]+)/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(value))) {
    const token = match[1] ?? match[2] ?? match[3] ?? "";
    if (token.trim()) tokens.push(unescapeQuotedToken(token.trim()));
  }

  return tokens;
}

function stripComment(value: string) {
  let quote: "\"" | "'" | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

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
    if (!quote && character === "/" && nextCharacter === "/") {
      return value.slice(0, index);
    }
  }

  return value;
}

function parseCustomLabels(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map((label) => label.trim()).filter(Boolean);
  }

  const raw = value?.trim() || "";
  if (!raw) return [];

  return raw
    .split(/\r?\n/)
    .flatMap((line) => {
      const cleanLine = stripComment(line).trim();
      if (!cleanLine) return [];

      // A line without commas is one label, so labels may naturally contain
      // spaces. Commas (and quotes) provide a compact single-line form.
      return cleanLine.includes(",")
        ? tokenize(cleanLine)
        : [
            cleanLine.replace(/^(["'])(.*)\1$/, (_match, _quote, label) =>
              unescapeQuotedToken(label.trim())
            ),
          ];
    })
    .filter(Boolean);
}

function edgeTokens(value: string) {
  return tokenize(
    stripComment(value)
      .replace(/<->|-->|->|--|—|–/g, " ")
      .trim()
  );
}

function duplicateEdgeKey(source: string, target: string, directed: boolean) {
  if (directed) return `${source}\u0000${target}`;
  return [source, target].sort().join("\u0000");
}

export function parseGraphInput(input: ParseGraphInput): ParsedGraph {
  const errors: GraphParseIssue[] = [];
  const warnings: GraphParseIssue[] = [];
  const nodes: ParsedGraphNode[] = [];
  const edges: ParsedGraphEdge[] = [];
  const integerNodeCount = Number.isInteger(input.nodeCount);

  if (!integerNodeCount || input.nodeCount < 1) {
    errors.push({ code: "invalid-node-count", value: String(input.nodeCount) });
  } else if (input.nodeCount > MAX_NODE_COUNT) {
    errors.push({ code: "too-many-nodes", value: String(input.nodeCount) });
  }

  const usableNodeCount =
    integerNodeCount && input.nodeCount > 0 && input.nodeCount <= MAX_NODE_COUNT
      ? input.nodeCount
      : 0;
  const labels =
    input.indexMode === "custom"
      ? parseCustomLabels(input.customLabels)
      : Array.from({ length: usableNodeCount }, (_, index) =>
          String(index + (input.indexMode === "one" ? 1 : 0))
        );

  if (input.indexMode === "custom") {
    if (labels.length === 0) {
      errors.push({ code: "custom-labels-required" });
    } else if (usableNodeCount > 0 && labels.length !== usableNodeCount) {
      errors.push({
        code: "custom-label-count-mismatch",
        value: String(labels.length),
      });
    }
  }

  const labelToId = new Map<string, string>();
  labels.forEach((label, index) => {
    const normalizedLabel = label.trim();
    if (labelToId.has(normalizedLabel)) {
      errors.push({ code: "duplicate-label", value: normalizedLabel });
      return;
    }

    const id = `n${index}`;
    labelToId.set(normalizedLabel, id);
    nodes.push({ id, index, label: normalizedLabel });
  });

  const seenEdges = new Set<string>();
  input.edgeList.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = lineIndex + 1;
    if (!stripComment(rawLine).trim()) return;

    const tokens = edgeTokens(rawLine);
    if (tokens.length !== 2) {
      errors.push({ code: "invalid-edge-format", line, value: rawLine.trim() });
      return;
    }

    const [sourceLabel, targetLabel] = tokens;
    const source = labelToId.get(sourceLabel);
    const target = labelToId.get(targetLabel);

    if (!source || !target) {
      const invalidValues = [
        source ? null : sourceLabel,
        target ? null : targetLabel,
      ].filter((value): value is string => Boolean(value));

      invalidValues.forEach((value) =>
        errors.push({ code: "invalid-node-reference", line, value })
      );
      return;
    }

    const key = duplicateEdgeKey(source, target, input.directed);
    if (seenEdges.has(key)) {
      warnings.push({ code: "duplicate-edge", line, value: rawLine.trim() });
      return;
    }

    if (source === target) {
      warnings.push({ code: "self-loop", line, value: sourceLabel });
    }

    seenEdges.add(key);
    edges.push({ id: `e${edges.length}`, line, source, target });
  });

  return {
    directed: input.directed,
    edges,
    errors,
    isValid: errors.length === 0,
    nodes,
    warnings,
  };
}

export function graphNodeLabel(index: number) {
  let value = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

