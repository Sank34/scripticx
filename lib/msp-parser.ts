export type MspExpression = {
  raw: string;
};

export type MspStatement =
  | {
      type: "assignment";
      line: number;
      variable: string;
      expression: MspExpression;
    }
  | {
      type: "print";
      line: number;
      expression: MspExpression;
    }
  | {
      type: "input";
      line: number;
      variable: string;
    }
  | {
      type: "if";
      line: number;
      condition: MspExpression;
      thenBody: MspStatement[];
      elseBody: MspStatement[];
    }
  | {
      type: "while";
      line: number;
      condition: MspExpression;
      body: MspStatement[];
    }
  | {
      type: "function";
      line: number;
      name: string;
      body: MspStatement[];
    }
  | {
      type: "unknown";
      line: number;
      raw: string;
    };

export type MspParseWarning =
  | { type: "elseWithoutIf"; line: number }
  | { type: "endWithoutBlock"; line: number }
  | { type: "loopWithoutEnd"; line: number }
  | { type: "ifWithoutEnd"; line: number }
  | { type: "functionWithoutEnd"; line: number }
  | { type: "missingThen"; line: number }
  | { type: "emptyVariable"; line: number }
  | { type: "unknownStatement"; line: number; raw: string };

export type MspProgram = {
  body: MspStatement[];
  warnings: MspParseWarning[];
};

type NormalizedLine = {
  line: number;
  raw: string;
  upper: string;
};

type StopToken = "ELSE" | "END";

function startsWithKeyword(line: string, keyword: string) {
  return line === keyword || line.startsWith(`${keyword} `);
}

function startsWithLoop(line: string) {
  return (
    startsWithKeyword(line, "WHILE") ||
    startsWithKeyword(line, "FOR") ||
    startsWithKeyword(line, "REPEAT")
  );
}

function stripInlineComment(line: string) {
  let inString = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      inString = !inString;
    }

    if (!inString && char === "#") {
      return line.slice(0, i);
    }

    if (!inString && char === "/" && next === "/") {
      return line.slice(0, i);
    }
  }

  return line;
}

function normalizeCode(code: string): NormalizedLine[] {
  return code
    .split("\n")
    .map((raw, index) => ({
      line: index + 1,
      raw: stripInlineComment(raw).replace(/:$/, "").trim(),
    }))
    .filter((line) => line.raw.length > 0)
    .map((line) => ({
      ...line,
      upper: line.raw.toUpperCase(),
    }));
}

function makeExpression(raw: string): MspExpression {
  return {
    raw: raw.trim(),
  };
}

function parseAssignment(
  line: NormalizedLine
): Extract<MspStatement, { type: "assignment" }> | null {
  const eqPos = line.raw.indexOf("=");

  if (eqPos < 0) return null;

  const variable = line.raw.slice(0, eqPos).trim();
  const expression = line.raw.slice(eqPos + 1).trim();

  return {
    type: "assignment",
    line: line.line,
    variable,
    expression: makeExpression(expression),
  };
}

function getIfCondition(line: NormalizedLine, warnings: MspParseWarning[]) {
  const thenIndex = line.upper.indexOf("THEN");

  if (thenIndex < 0) {
    warnings.push({ type: "missingThen", line: line.line });
    return line.raw.slice(2).trim();
  }

  return line.raw.slice(2, thenIndex).trim();
}

function parseBlock(
  lines: NormalizedLine[],
  start: number,
  stops: StopToken[],
  warnings: MspParseWarning[]
) {
  const body: MspStatement[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];

    if (stops.includes("ELSE") && line.upper === "ELSE") {
      return { body, index, stop: "ELSE" as const };
    }

    if (stops.includes("END") && isEnd(line.upper)) {
      return { body, index, stop: "END" as const };
    }

    if (line.upper === "ELSE") {
      warnings.push({ type: "elseWithoutIf", line: line.line });
      index++;
      continue;
    }

    if (isEnd(line.upper)) {
      warnings.push({ type: "endWithoutBlock", line: line.line });
      index++;
      continue;
    }

    if (line.upper.startsWith("IF ")) {
      const condition = getIfCondition(line, warnings);
      const thenResult = parseBlock(lines, index + 1, ["ELSE", "END"], warnings);
      let elseBody: MspStatement[] = [];
      let nextIndex = thenResult.index;

      if (thenResult.stop === "ELSE") {
        const elseResult = parseBlock(lines, thenResult.index + 1, ["END"], warnings);
        elseBody = elseResult.body;
        nextIndex = elseResult.index;

        if (elseResult.stop !== "END") {
          warnings.push({ type: "ifWithoutEnd", line: line.line });
        } else {
          nextIndex++;
        }
      } else if (thenResult.stop === "END") {
        nextIndex++;
      } else {
        warnings.push({ type: "ifWithoutEnd", line: line.line });
      }

      body.push({
        type: "if",
        line: line.line,
        condition: makeExpression(condition),
        thenBody: thenResult.body,
        elseBody,
      });
      index = nextIndex;
      continue;
    }

    if (startsWithLoop(line.upper)) {
      const result = parseBlock(lines, index + 1, ["END"], warnings);
      const condition = line.raw.replace(/^(WHILE|FOR|REPEAT)\b/i, "").trim();

      if (result.stop !== "END") {
        warnings.push({ type: "loopWithoutEnd", line: line.line });
      }

      body.push({
        type: "while",
        line: line.line,
        condition: makeExpression(condition),
        body: result.body,
      });
      index = result.stop === "END" ? result.index + 1 : result.index;
      continue;
    }

    if (line.upper.startsWith("FUNCTION ")) {
      const result = parseBlock(lines, index + 1, ["END"], warnings);
      const name = line.raw.slice(9).trim().split(/\s|\(/)[0] || "";

      if (result.stop !== "END") {
        warnings.push({ type: "functionWithoutEnd", line: line.line });
      }

      body.push({
        type: "function",
        line: line.line,
        name,
        body: result.body,
      });
      index = result.stop === "END" ? result.index + 1 : result.index;
      continue;
    }

    if (line.upper.startsWith("PRINT ")) {
      body.push({
        type: "print",
        line: line.line,
        expression: makeExpression(line.raw.slice(6)),
      });
      index++;
      continue;
    }

    if (line.upper.startsWith("INPUT ")) {
      const variable = line.raw.slice(6).trim();

      if (!variable) {
        warnings.push({ type: "emptyVariable", line: line.line });
      }

      body.push({
        type: "input",
        line: line.line,
        variable,
      });
      index++;
      continue;
    }

    const assignment = parseAssignment(line);

    if (assignment) {
      if (!assignment.variable) {
        warnings.push({ type: "emptyVariable", line: line.line });
      }

      body.push(assignment);
      index++;
      continue;
    }

    warnings.push({
      type: "unknownStatement",
      line: line.line,
      raw: line.raw,
    });
    body.push({
      type: "unknown",
      line: line.line,
      raw: line.raw,
    });
    index++;
  }

  return { body, index, stop: null };
}

function isEnd(line: string) {
  return line === "END" || line.startsWith("END ");
}

export function parseMiniScriptProgram(code: string): MspProgram {
  const warnings: MspParseWarning[] = [];
  const lines = normalizeCode(code);
  const result = parseBlock(lines, 0, [], warnings);

  return {
    body: result.body,
    warnings,
  };
}
