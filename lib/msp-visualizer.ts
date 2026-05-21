import { parseMiniScriptProgram, type MspStatement } from "@/lib/msp-parser";

type TreeLine = {
  label: string;
  depth: number;
};

function expression(raw: string) {
  return raw.trim() || "?";
}

function statementLabel(statement: MspStatement) {
  if (statement.type === "assignment") {
    return `Assignment: ${statement.variable} = ${expression(statement.expression.raw)}`;
  }

  if (statement.type === "print") {
    return `Print: ${expression(statement.expression.raw)}`;
  }

  if (statement.type === "input") {
    return `Input: ${statement.variable || "?"}`;
  }

  if (statement.type === "if") {
    return `If: ${expression(statement.condition.raw)}`;
  }

  if (statement.type === "while") {
    return `While: ${expression(statement.condition.raw)}`;
  }

  if (statement.type === "function") {
    return `Function: ${statement.name || "anonymous"}`;
  }

  return `Unknown: ${statement.raw}`;
}

function collectAstLines(
  statements: MspStatement[],
  depth: number,
  lines: TreeLine[]
) {
  for (const statement of statements) {
    lines.push({
      depth,
      label: statementLabel(statement),
    });

    if (statement.type === "if") {
      lines.push({ depth: depth + 1, label: "Then" });
      collectAstLines(statement.thenBody, depth + 2, lines);

      if (statement.elseBody.length > 0) {
        lines.push({ depth: depth + 1, label: "Else" });
        collectAstLines(statement.elseBody, depth + 2, lines);
      }
    }

    if (statement.type === "while" || statement.type === "function") {
      collectAstLines(statement.body, depth + 1, lines);
    }
  }
}

function renderTree(lines: TreeLine[]) {
  return lines
    .map((line) => `${"  ".repeat(line.depth)}- ${line.label}`)
    .join("\n");
}

function collectFlowLines(
  statements: MspStatement[],
  depth: number,
  lines: TreeLine[]
) {
  for (const statement of statements) {
    if (statement.type === "assignment") {
      lines.push({
        depth,
        label: `Step: ${statement.variable} = ${expression(statement.expression.raw)}`,
      });
      continue;
    }

    if (statement.type === "print") {
      lines.push({ depth, label: `Output: ${expression(statement.expression.raw)}` });
      continue;
    }

    if (statement.type === "input") {
      lines.push({ depth, label: `Input: ${statement.variable || "?"}` });
      continue;
    }

    if (statement.type === "if") {
      lines.push({ depth, label: `Decision: ${expression(statement.condition.raw)} ?` });
      lines.push({ depth: depth + 1, label: "Yes" });
      collectFlowLines(statement.thenBody, depth + 2, lines);

      if (statement.elseBody.length > 0) {
        lines.push({ depth: depth + 1, label: "No" });
        collectFlowLines(statement.elseBody, depth + 2, lines);
      }

      lines.push({ depth, label: "Merge" });
      continue;
    }

    if (statement.type === "while") {
      lines.push({ depth, label: `Loop condition: ${expression(statement.condition.raw)} ?` });
      lines.push({ depth: depth + 1, label: "Yes" });
      collectFlowLines(statement.body, depth + 2, lines);
      lines.push({ depth: depth + 1, label: "Repeat loop" });
      lines.push({ depth: depth + 1, label: "No" });
      continue;
    }

    if (statement.type === "function") {
      lines.push({ depth, label: `Function: ${statement.name || "anonymous"}` });
      collectFlowLines(statement.body, depth + 1, lines);
      continue;
    }

    lines.push({ depth, label: `Unknown: ${statement.raw}` });
  }
}

export function visualizeMiniScript(code: string) {
  const program = parseMiniScriptProgram(code);
  const astLines: TreeLine[] = [{ depth: 0, label: "Program" }];
  const flowLines: TreeLine[] = [{ depth: 0, label: "Start" }];

  collectAstLines(program.body, 1, astLines);
  collectFlowLines(program.body, 1, flowLines);
  flowLines.push({ depth: 0, label: "End" });

  return {
    ast: renderTree(astLines),
    flowchart: renderTree(flowLines),
    warnings: program.warnings,
  };
}
