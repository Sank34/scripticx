import { parseExpressionSource, type ASTNode } from "./expressions";

export type Instruction =
  | { type: "EMPTY" | "ELSE" | "END" }
  | { type: "ERROR"; message: string }
  | { type: "INPUT"; var: string }
  | { type: "ASSIGN"; var: string; value: string }
  | { type: "PRINT" | "CALL" | "RETURN"; value: string }
  | { type: "IF" | "WHILE"; condition: string }
  | { type: "FOR"; var: string; from: string; to: string; increment: string }
  | { type: "FUNCTION"; name: string; params: string[] };
export type FunctionDefinition = { name: string; params: string[]; start: number; end: number };
export type CompiledProgram = {
  instructions: readonly Instruction[];
  ends: Map<number, number>;
  starts: Map<number, number>;
  alternatives: Map<number, number>;
  functions: Map<string, FunctionDefinition>;
  expressions: Map<string, ASTNode>;
};
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const BUILTINS = new Set(["INT", "TRUNC", "FLOOR", "ROUND", "ABS"]);
const reserved = new Set([...BUILTINS, "FOR", "FROM", "TO", "INCR", "FUNCTION", "RETURN", "PRINT", "INPUT", "IF", "THEN", "ELSE", "END", "WHILE", "TRUE", "FALSE", "AND", "OR", "NOT", "DIV", "MOD"]);
export function lineError(message: string, line: number): Error & { line: number } {
  return Object.assign(new Error(message), { line });
}
function validIdentifier(name: string) { return identifier.test(name) && !reserved.has(name.toUpperCase()); }

export function stripComment(line: string) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (quoted && line[i] === "\\") { i++; continue; }
    if (line[i] === '"') quoted = !quoted;
    if (line[i] === "#" && !quoted) return line.slice(0, i).trim();
  }
  return line.trim();
}
function normalizeCondition(source: string) {
  return source.replace(/"(?:\\.|[^"\\])*"|≤|≥|≠|<>|(?<![<>=!])=(?!=)/g,
    (token) => token.startsWith('"') ? token : ({ "≤": "<=", "≥": ">=", "≠": "!=", "<>": "!=", "=": "==" }[token] || token));
}
export function parseLine(source: string): Instruction {
  const line = stripComment(source).replace(/:\s*$/, "");
  if (!line) return { type: "EMPTY" };
  const error = (message: string): Instruction => ({ type: "ERROR", message });
  let match: RegExpMatchArray | null;
  if ((match = line.match(/^FUNCTION\s+([A-Za-z_][\w]*)\s*\(([^()]*)\)\s*$/))) {
    return { type: "FUNCTION", name: match[1], params: match[2].trim() ? match[2].split(",").map(p => p.trim()) : [] };
  }
  if (/^FUNCTION\b/.test(line)) return error("Expected FUNCTION name(parameter, ...)");
  if ((match = line.match(/^FOR\s+(\w+)\s+FROM\s+(.+?)\s+TO\s+(.+?)(?:\s+INCR\s+(.+))?$/))) {
    return { type: "FOR", var: match[1], from: match[2], to: match[3], increment: match[4] || "1" };
  }
  if (/^FOR\b/.test(line)) return error("Expected FOR variable FROM start TO end [INCR increment]");
  if ((match = line.match(/^IF\b(.*)$/))) {
    if (!/\sTHEN$/.test(line)) return error("Missing THEN in IF statement");
    return { type: "IF", condition: normalizeCondition(match[1].replace(/\sTHEN$/, "").trim()) };
  }
  if ((match = line.match(/^WHILE\b(.*)$/))) return { type: "WHILE", condition: normalizeCondition(match[1].trim()) };
  if (line === "ELSE" || line === "END") return { type: line };
  if ((match = line.match(/^INPUT\b(.*)$/))) return { type: "INPUT", var: match[1].trim() };
  if ((match = line.match(/^(PRINT|RETURN)\b(.*)$/))) return { type: match[1] as "PRINT" | "RETURN", value: match[2].trim() };
  if ((match = line.match(/^([A-Za-z_][\w]*)\s*\(/))) return { type: "CALL", value: line };
  if ((match = line.match(/^(.*?)=(.*)$/))) return { type: "ASSIGN", var: match[1].trim(), value: match[2].trim() };
  return error(`Unknown instruction "${line}"`);
}

export function compileProgram(instructions: readonly Instruction[], syntax = false): CompiledProgram {
  const compiled: CompiledProgram = { instructions, ends: new Map(), starts: new Map(), alternatives: new Map(), functions: new Map(), expressions: new Map() };
  const stack: Array<{ type: "IF" | "WHILE" | "FOR" | "FUNCTION"; index: number; alternative?: number }> = [];
  instructions.forEach((inst, index) => {
    const fail = (message: string): never => { throw lineError(message, index + 1); };
    if (inst.type === "ERROR") fail(inst.message);
    if (inst.type === "ASSIGN" || inst.type === "INPUT" || inst.type === "FOR") {
      if (!inst.var) fail(inst.type === "INPUT" ? "INPUT is missing a variable name" : "Assignment is missing a variable name");
      if (!validIdentifier(inst.var)) fail(`Invalid variable name "${inst.var}"`);
    }
    if (inst.type === "ASSIGN" && !inst.value) fail(`Assignment to "${inst.var}" is missing a value`);
    if (inst.type === "PRINT" && !inst.value) fail("PRINT is missing an expression");
    if ((inst.type === "IF" || inst.type === "WHILE") && !inst.condition) fail(`${inst.type} is missing a condition`);
    if (inst.type === "FUNCTION") {
      if (stack.length) fail("Functions must be declared at the top level");
      if (!validIdentifier(inst.name)) fail(`Invalid function name "${inst.name}"`);
      if (compiled.functions.has(inst.name)) fail(`Function "${inst.name}" is already defined`);
      if (inst.params.some(param => !validIdentifier(param))) fail("Invalid function parameter");
      if (new Set(inst.params).size !== inst.params.length) fail("Duplicate function parameter");
      compiled.functions.set(inst.name, { ...inst, start: index, end: -1 });
    }
    if (inst.type === "RETURN" && !stack.some(block => block.type === "FUNCTION")) fail("RETURN outside a function");
    if (inst.type === "IF" || inst.type === "WHILE" || inst.type === "FOR" || inst.type === "FUNCTION") stack.push({ type: inst.type, index });
    if (inst.type === "ELSE") {
      const block = stack.at(-1);
      if (!block || block.type !== "IF") fail("ELSE without matching IF");
      if (block!.alternative !== undefined) fail("IF block can only contain one ELSE");
      block!.alternative = index;
      compiled.alternatives.set(block!.index, index);
    }
    if (inst.type === "END") {
      const block = stack.pop();
      if (!block) fail("END without matching block");
      compiled.ends.set(block!.index, index);
      compiled.starts.set(index, block!.index);
      if (block!.alternative !== undefined) compiled.ends.set(block!.alternative, index);
      if (block!.type === "FUNCTION") {
        const definition = instructions[block!.index];
        if (definition.type === "FUNCTION") compiled.functions.get(definition.name)!.end = index;
      }
    }
  });
  const unclosed = stack.at(-1);
  if (unclosed) throw lineError(`Missing END for ${unclosed.type} statement`, unclosed.index + 1);
  if (syntax) instructions.forEach((inst, index) => {
    const sources = inst.type === "FOR" ? [inst.from, inst.to, inst.increment]
      : "condition" in inst ? [inst.condition] : "value" in inst && inst.value ? [inst.value] : [];
    for (const source of sources) {
      try {
        const ast = parseExpressionSource(source);
        if (inst.type === "CALL" && ast.type !== "call") throw new Error("Expected a function call");
        validateCalls(ast, compiled.functions);
        compiled.expressions.set(source, ast);
      } catch (error) { throw lineError(error instanceof Error ? error.message : "Invalid expression", index + 1); }
    }
  });
  return compiled;
}
function validateCalls(node: ASTNode, functions: Map<string, FunctionDefinition>) {
  if (node.type === "call") {
    const definition = functions.get(node.name);
    if (!definition && !BUILTINS.has(node.name.toUpperCase())) throw new Error(`Unknown function "${node.name}"`);
    if (definition && definition.params.length !== node.args.length) throw new Error(`${node.name} expects ${definition.params.length} arguments`);
    node.args.forEach(arg => validateCalls(arg, functions));
  } else if (node.type === "binary") { validateCalls(node.left, functions); validateCalls(node.right, functions); }
  else if (node.type === "unary") validateCalls(node.value, functions);
}
