export type StepResult = {
  output: any;
  variables: Record<string, Value>;
  currentLine: number;
  inputRequest?: string;
} | null;

type ASTNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "variable"; name: string }
  | { type: "binary"; operator: string; left: ASTNode; right: ASTNode }
  | { type: "unary"; operator: string; value: ASTNode };

type Value = string | number | boolean;

let variables: Record<string, Value> = {};
let currentLine = 0;
let steps = 0;
const MAX_STEPS = 1000; 

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

    if ("+-*/%()<>".includes(c)) {
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

    pos++;

    if (!isNaN(Number(token))) {
      return { type: "number", value: parseFloat(token) };
    }

    if (token.startsWith('"') && token.endsWith('"')) {
      return { type: "string", value: token.slice(1, -1) };
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
    return parsePrimary();
  }

  function parseMulDiv(): ASTNode {
    let node = parseUnary();

    while (tokens[pos] === "*" || tokens[pos] === "/" || tokens[pos] === "%") {
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

  return parseOr();
}

function evalAST(node: ASTNode): Value {
  if (node.type === "number") return node.value;
  if (node.type === "string") return node.value;

  if (node.type === "variable") {
    if (variables.hasOwnProperty(node.name)) {
      return variables[node.name];
    }
    throw new Error(`Variable "${node.name}" is not defined`);
  }

  if (node.type === "unary") {
    const val = evalAST(node.value);
    if (node.operator === "NOT") return !val;
  }

  if (node.type === "binary") {
    console.log("EVAL:", node.operator, node.left, node.right);
    const left = evalAST(node.left);
    const right = evalAST(node.right);

    switch (node.operator) {
      case "+":
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }
        return (left as number) + (right as number);

      case "-":
        return (left as number) - (right as number);

      case "*":
        return (left as number) * (right as number);

      case "/":
        return (left as number) / (right as number);

      case "%":
        return (left as number) % (right as number);

      case ">":
        return left > right;

      case "<":
        return left < right;

      case ">=":
        return left >= right;

      case "<=":
        return left <= right;

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
  }

  return inst;
}

function evaluate(expr: string): Value {
  const tokens = tokenize(expr);
  const ast = parseExpression(tokens);
  return evalAST(ast);
}

function evaluateCondition(cond: string): boolean {
  return Boolean(evaluate(cond));
}

export function step(program: any[]): StepResult {
  if (currentLine >= program.length) return null;

  steps++;
  if (steps > MAX_STEPS) {
    throw {
      message: "Possible infinite loop detected",
      line: currentLine + 1,
    };
  }

  let inst = program[currentLine];
  let output: any = null;

  if (inst.type === "ERROR") {
    throw {
      message: inst.message,
      line: currentLine
    };
  }
  if (inst.type === "EMPTY") {
    currentLine++;
    return { output: null, variables: { ...variables }, currentLine };
  } else if (inst.type === "ASSIGN") {
    try {
      variables[inst.var] = evaluate(inst.value);
    } catch (e: any) {
      throw { message: e.message, line: currentLine + 1 };
    }
  } else if (inst.type === "PRINT") {
    try {
      output = evaluate(inst.value);
    } catch (e: any) {
      throw { message: e.message, line: currentLine + 1 };
    }
  } else if (inst.type === "IF") {
    if (!evaluateCondition(inst.condition)) {
      let depth = 1;
      while (depth > 0) {
        currentLine++;
        if (program[currentLine].type === "IF") depth++;
        if (program[currentLine].type === "END") depth--;
        if (depth === 1 && program[currentLine].type === "ELSE") break;
      }
    }
  } else if (inst.type === "ELSE") {
    let depth = 1;
    while (depth > 0) {
      currentLine++;
      if (program[currentLine].type === "IF") depth++;
      if (program[currentLine].type === "END") depth--;
    }
  } else if (inst.type === "WHILE") {
    if (!evaluateCondition(inst.condition)) {
      let depth = 1;
      while (depth > 0) {
        currentLine++;
        if (program[currentLine].type === "WHILE") depth++;
        if (program[currentLine].type === "END") depth--;
      }
    }
  } else if (inst.type === "END") {
    let depth = 1;
    let temp = currentLine;

    while (temp > 0) {
      temp--;
      if (program[temp].type === "END") depth++;
      else if (program[temp].type === "WHILE") depth--;

      if (depth === 0) {
        currentLine = temp - 1;
        break;
      }

      if (program[temp].type === "IF") break;
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