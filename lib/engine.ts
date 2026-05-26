export type StepResult = {
  output: any;
  variables: Record<string, Value>;
  currentLine: number;
  inputRequest?: string;
} | null;

type ASTNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "variable"; name: string }
  | { type: "binary"; operator: string; left: ASTNode; right: ASTNode }
  | { type: "unary"; operator: string; value: ASTNode }
  | { type: "call"; name: string; args: ASTNode[] };

type Value = string | number | boolean;

let variables: Record<string, Value> = {};
let currentLine = 0;
let steps = 0;
const MAX_STEPS = 1000; 
const validatedPrograms = new WeakSet<any[]>();

export function reset() {
  variables = {};
  currentLine = 0;
  steps = 0;
}

function trim(str: string) {
  return str.trim();
}

function normalizeOperators(str: string) {
  return str
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/\s=\s/g, " == ")

}

export function setVariable(name: string, value: Value) {
  variables[name] = value;
}

export function advanceLine() {
  currentLine++;
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    let c = expr[i];

    if (c === " ") {
      i++;
      continue;
    }

    if (i + 1 < expr.length) {
      const two = c + expr[i + 1];
      if (["<=", ">=", "==", "!="].includes(two)) {
        tokens.push(two);
        i += 2;
        continue;
      }
    }

    if ("+-*/%()<>,".includes(c)) {
      tokens.push(c);
      i++;
      continue;
    }

    if (c === '"') {
      let str = '"';
      i++;

      while (i < expr.length && expr[i] !== '"') {
        str += expr[i];
        i++;
      }

      str += '"';
      i++;

      tokens.push(str);
      continue;
    }

    if (/[0-9]/.test(c)) {
      let num = "";
      let dotCount = 0;

      while (
        i < expr.length &&
        (/[0-9]/.test(expr[i]) || expr[i] === ".")
      ) {
        if (expr[i] === ".") {
          dotCount++;
          if (dotCount > 1) break;
        }
        num += expr[i];
        i++;
      }

      tokens.push(num);
      continue;
    }

    if (/[a-zA-Z_]/.test(c)) {
      let word = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      tokens.push(word);
      continue;
    }

    i++;
  }

  return tokens;
}



function parseExpression(tokens: string[]): ASTNode {
  let pos = 0;

  function parsePrimary(): ASTNode {
    const token = tokens[pos];

    if (token === "(") {
      pos++; // (

      const node = parseOr();

      if (tokens[pos] !== ")") {
        throw new Error("Missing closing parenthesis");
      }

      pos++; // )

      return node;
    }

    if (token === undefined) {
      throw new Error("Missing expression");
    }

    pos++;

    if (!isNaN(Number(token))) {
      return { type: "number", value: parseFloat(token) };
    }

    if (token.startsWith('"') && token.endsWith('"')) {
      return { type: "string", value: token.slice(1, -1) };
    }

    if (token.toUpperCase() === "TRUE") {
      return { type: "boolean", value: true };
    }

    if (token.toUpperCase() === "FALSE") {
      return { type: "boolean", value: false };
    }

    if (tokens[pos] === "(") {
      pos++;

      const args: ASTNode[] = [];

      if (tokens[pos] !== ")") {
        while (true) {
          args.push(parseOr());

          if (tokens[pos] !== ",") break;
          pos++;
        }
      }

      if (tokens[pos] !== ")") {
        throw new Error("Missing closing parenthesis");
      }

      pos++;

      return {
        type: "call",
        name: token,
        args,
      };
    }

    return { type: "variable", name: token };
  }

  function parseUnary(): ASTNode {
    if (tokens[pos] === "NOT") {
      pos++;
      return {
        type: "unary",
        operator: "NOT",
        value: parseUnary(),
      };
    }

    if (tokens[pos] === "-") {
      pos++;
      return {
        type: "unary",
        operator: "-",
        value: parseUnary(),
      };
    }

    if (tokens[pos] === "+") {
      pos++;
      return parseUnary();
    }

    return parsePrimary();
  }

  function parseMulDiv(): ASTNode {
    let node = parseUnary();

    while (["*", "/", "%", "DIV", "MOD"].includes(tokens[pos]?.toUpperCase())) {
      const op = tokens[pos++];
      const right = parseUnary();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  function parseAddSub(): ASTNode {
    let node = parseMulDiv();

    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const right = parseMulDiv();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  function parseComparison(): ASTNode {
    let node = parseAddSub();

    while (
      ["<", ">", "<=", ">=", "==", "!="].includes(tokens[pos])
    ) {
      const op = tokens[pos++];
      const right = parseAddSub();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  function parseAnd(): ASTNode {
    let node = parseComparison();

    while (tokens[pos] === "AND") {
      const op = tokens[pos++];
      const right = parseComparison();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  function parseOr(): ASTNode {
    let node = parseAnd();

    while (tokens[pos] === "OR") {
      const op = tokens[pos++];
      const right = parseAnd();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  const expression = parseOr();

  if (pos < tokens.length) {
    throw new Error(`Unexpected token "${tokens[pos]}"`);
  }

  return expression;
}

function asNumber(value: Value, operator: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Operator ${operator} can only be used with numbers`);
  }

  return value;
}

function requireArity(name: string, args: Value[], count: number) {
  if (args.length !== count) {
    throw new Error(`${name} expects ${count} argument${count === 1 ? "" : "s"}`);
  }
}

function evaluateFunctionCall(name: string, args: Value[]): Value {
  const fn = name.toUpperCase();

  switch (fn) {
    case "INT":
    case "TRUNC":
      requireArity(fn, args, 1);
      return Math.trunc(asNumber(args[0], fn));

    case "FLOOR":
      requireArity(fn, args, 1);
      return Math.floor(asNumber(args[0], fn));

    case "ROUND":
      if (args.length !== 1 && args.length !== 2) {
        throw new Error("ROUND expects 1 or 2 arguments");
      }

      if (args.length === 1) {
        return Math.round(asNumber(args[0], fn));
      }

      const decimals = asNumber(args[1], fn);

      if (!Number.isInteger(decimals) || decimals < 0) {
        throw new Error("ROUND decimals must be a non-negative integer");
      }

      const factor = 10 ** decimals;
      return Math.round(asNumber(args[0], fn) * factor) / factor;

    case "ABS":
      requireArity(fn, args, 1);
      return Math.abs(asNumber(args[0], fn));

    default:
      throw new Error(`Unknown function "${name}"`);
  }
}

function evalAST(node: ASTNode): Value {
  if (node.type === "number") return node.value;
  if (node.type === "string") return node.value;
  if (node.type === "boolean") return node.value;

  if (node.type === "variable") {
    if (variables.hasOwnProperty(node.name)) {
      return variables[node.name];
    }
    throw new Error(`Variable "${node.name}" is not defined`);
  }

  if (node.type === "unary") {
    const val = evalAST(node.value);
    if (node.operator === "NOT") return !val;
    if (node.operator === "-") {
      if (typeof val !== "number") {
        throw new Error("Unary minus can only be used with numbers");
      }
      return -val;
    }
  }

  if (node.type === "call") {
    return evaluateFunctionCall(node.name, node.args.map(evalAST));
  }

  if (node.type === "binary") {
    const left = evalAST(node.left);
    const right = evalAST(node.right);
    const operator = node.operator.toUpperCase();

    switch (operator) {
      case "+":
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }
        return asNumber(left, "+") + asNumber(right, "+");

      case "-":
        return asNumber(left, "-") - asNumber(right, "-");

      case "*":
        return asNumber(left, "*") * asNumber(right, "*");

      case "/":
        if (asNumber(right, "/") === 0) {
          throw new Error("Division by zero is not allowed");
        }
        return asNumber(left, "/") / asNumber(right, "/");

      case "DIV":
        if (asNumber(right, "DIV") === 0) {
          throw new Error("Division by zero is not allowed");
        }
        return Math.trunc(asNumber(left, "DIV") / asNumber(right, "DIV"));

      case "%":
      case "MOD":
        if (asNumber(right, operator) === 0) {
          throw new Error("Modulo by zero is not allowed");
        }
        return asNumber(left, operator) % asNumber(right, operator);

      case ">":
        return asNumber(left, ">") > asNumber(right, ">");

      case "<":
        return asNumber(left, "<") < asNumber(right, "<");

      case ">=":
        return asNumber(left, ">=") >= asNumber(right, ">=");

      case "<=":
        return asNumber(left, "<=") <= asNumber(right, "<=");

      case "==":
        return left === right;

      case "!=":
        return left !== right;

      case "AND":
        return Boolean(left) && Boolean(right);

      case "OR":
        return Boolean(left) || Boolean(right);
    }
  }

  throw new Error("Unknown expression");
}

export function parseLine(line: string) {
  line = trim(line);
  line = line.replace(":", "");

  if (line.startsWith("#")) return { type: "EMPTY" };

  if (line.includes("#")) {
    line = line.split("#")[0].trim();
  }

  if (line === "") return { type: "EMPTY" };

  let inst: any = {
    type: "",
    var: "",
    value: "",
    condition: "",
  };

  if (line.startsWith("PRINT ")) {
    inst.type = "PRINT";
    inst.value = trim(line.substring(6));
  } else if (line.startsWith("IF ")) {
    inst.type = "IF";
    if (!line.includes("THEN")) {
      // throw new Error("Missing THEN in IF statement");
      return {
        type: "ERROR",
        message: "Missing THEN in IF statement"
      }
    }
    let condition = line.substring(3, line.indexOf("THEN")).trim();
    inst.condition = normalizeOperators(condition);
  } else if (line.startsWith("WHILE ")) {
    inst.type = "WHILE";
    inst.condition = normalizeOperators(trim(line.substring(6)));
  } else if (line === "ELSE") {
    inst.type = "ELSE";
  } else if (line === "END") {
    inst.type = "END";
  } else if (line.startsWith("INPUT ")) {
    inst.type = "INPUT";
    inst.var = trim(line.substring(6));
  } else if (line.includes("=")) {
    inst.type = "ASSIGN";
    let eqPos = line.indexOf("=");
    inst.var = trim(line.substring(0, eqPos));
    inst.value = trim(line.substring(eqPos + 1));
  } else {
    inst.type = "ERROR";
    inst.message = `Unknown instruction "${line}"`;
  }

  return inst;
}

function createLineError(message: string, line: number) {
  const err: any = new Error(message);
  err.line = line;
  return err;
}

export function validateProgram(program: any[]) {
  const stack: Array<{ type: "IF" | "WHILE"; line: number; hasElse?: boolean }> = [];

  program.forEach((inst, index) => {
    const line = index + 1;

    if (!inst?.type) {
      throw createLineError("Unknown instruction", line);
    }

    if (inst.type === "ERROR") {
      throw createLineError(inst.message || "Invalid instruction", line);
    }

    if (inst.type === "ASSIGN") {
      if (!inst.var) {
        throw createLineError("Assignment is missing a variable name", line);
      }

      if (!inst.value) {
        throw createLineError(`Assignment to "${inst.var}" is missing a value`, line);
      }
    }

    if (inst.type === "INPUT" && !inst.var) {
      throw createLineError("INPUT is missing a variable name", line);
    }

    if (inst.type === "PRINT" && !inst.value) {
      throw createLineError("PRINT is missing an expression", line);
    }

    if (inst.type === "IF") {
      if (!inst.condition) {
        throw createLineError("IF is missing a condition", line);
      }

      stack.push({ type: "IF", line });
    }

    if (inst.type === "WHILE") {
      if (!inst.condition) {
        throw createLineError("WHILE is missing a condition", line);
      }

      stack.push({ type: "WHILE", line });
    }

    if (inst.type === "ELSE") {
      const current = stack.at(-1);

      if (!current || current.type !== "IF") {
        throw createLineError("ELSE without matching IF", line);
      }

      if (current.hasElse) {
        throw createLineError("IF block can only contain one ELSE", line);
      }

      current.hasElse = true;
    }

    if (inst.type === "END") {
      const current = stack.pop();

      if (!current) {
        throw createLineError("END without matching block", line);
      }
    }
  });

  const unclosed = stack.at(-1);

  if (unclosed) {
    throw createLineError(
      `Missing END for ${unclosed.type} statement`,
      unclosed.line
    );
  }
}

function evaluate(expr: string): Value {
  const tokens = tokenize(expr);
  const ast = parseExpression(tokens);
  return evalAST(ast);
}

function evaluateCondition(cond: string): boolean {
  return Boolean(evaluate(cond));
}

function isBlockStart(type: string) {
  return type === "IF" || type === "WHILE";
}

function findElseOrEndForIf(program: any[], line: number) {
  let depth = 1;

  for (let i = line + 1; i < program.length; i++) {
    const type = program[i].type;

    if (isBlockStart(type)) depth++;

    if (type === "END") {
      depth--;
      if (depth === 0) return i;
    }

    if (depth === 1 && type === "ELSE") return i;
  }

  throw new Error("Missing END for IF statement");
}

function findMatchingBlockStart(program: any[], line: number) {
  let depth = 1;

  for (let i = line - 1; i >= 0; i--) {
    const type = program[i].type;

    if (type === "END") depth++;

    if (isBlockStart(type)) {
      depth--;
      if (depth === 0) return i;
    }
  }

  throw new Error("END without matching block");
}

function findMatchingEndFromElse(program: any[], line: number) {
  let depth = 1;

  for (let i = line + 1; i < program.length; i++) {
    const type = program[i].type;

    if (isBlockStart(type)) depth++;

    if (type === "END") {
      depth--;
      if (depth === 0) return i;
    }
  }

  throw new Error("Missing END for ELSE statement");
}

function findMatchingEndForBlock(program: any[], line: number) {
  let depth = 1;

  for (let i = line + 1; i < program.length; i++) {
    const type = program[i].type;

    if (isBlockStart(type)) depth++;

    if (type === "END") {
      depth--;
      if (depth === 0) return i;
    }
  }

  throw new Error(`Missing END for ${program[line].type} statement`);
}

export function step(program: any[]): StepResult {
  if (!validatedPrograms.has(program)) {
    validateProgram(program);
    validatedPrograms.add(program);
  }

  if (currentLine >= program.length) return null;

  steps++;
  if (steps > MAX_STEPS) {
    const err: any = new Error("Possible infinite loop detected");
    err.line = currentLine + 1;
    throw err;
  }

  let inst = program[currentLine];
  let output: any = null;

  if (inst.type === "ERROR") {
    throw createLineError(inst.message, currentLine + 1);
  }
  if (inst.type === "EMPTY") {
    currentLine++;
    return { output: null, variables: { ...variables }, currentLine };
  } else if (inst.type === "ASSIGN") {
    try {
      variables[inst.var] = evaluate(inst.value);
    } catch (e: any) {
      const err: any = new Error(e.message);
      err.line = currentLine + 1;
      throw err;
    }
  } else if (inst.type === "PRINT") {
    try {
      output = evaluate(inst.value);
    } catch (e: any) {
      const err: any = new Error(e.message);
      err.line = currentLine + 1;
      throw err;
    }
  } else if (inst.type === "IF") {
    if (!evaluateCondition(inst.condition)) {
      currentLine = findElseOrEndForIf(program, currentLine);
    }
  } else if (inst.type === "ELSE") {
    currentLine = findMatchingEndFromElse(program, currentLine);
  } else if (inst.type === "WHILE") {
    if (!evaluateCondition(inst.condition)) {
      currentLine = findMatchingEndForBlock(program, currentLine);
    }
  } else if (inst.type === "END") {
    const start = findMatchingBlockStart(program, currentLine);

    if (program[start].type === "WHILE") {
      currentLine = start - 1;
    }
  } else if (inst.type === "INPUT") {
    // currentLine++;
    return {
      output: null,
      variables: { ...variables },
      currentLine,
      inputRequest: inst.var,
    };
  }

  currentLine++;

  return { output, variables: { ...variables }, currentLine };
}
