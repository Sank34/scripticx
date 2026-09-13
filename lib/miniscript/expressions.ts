export type ASTNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "variable"; name: string }
  | { type: "binary"; operator: string; left: ASTNode; right: ASTNode }
  | { type: "unary"; operator: string; value: ASTNode }
  | { type: "call"; name: string; args: ASTNode[] };

export type Value = string | number | boolean;

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    let c = expr[i];

    if (/\s/.test(c)) {
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
      const start = i++;
      while (i < expr.length && expr[i] !== '"') {
        if (expr[i] === "\\") i++;
        i++;
      }
      if (i >= expr.length) throw new Error("Unterminated string");
      tokens.push(expr.slice(start, ++i));
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

    throw new Error(`Unexpected character "${c}"`);
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
      return { type: "string", value: JSON.parse(token) as string };
    }

    if (token.toUpperCase() === "TRUE") {
      return { type: "boolean", value: true };
    }

    if (token.toUpperCase() === "FALSE") {
      return { type: "boolean", value: false };
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) throw new Error(`Unexpected token "${token}"`);

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
    if (tokens[pos]?.toUpperCase() === "NOT") {
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

    while (tokens[pos]?.toUpperCase() === "AND") {
      const op = tokens[pos++];
      const right = parseComparison();
      node = { type: "binary", operator: op, left: node, right };
    }

    return node;
  }

  function parseOr(): ASTNode {
    let node = parseAnd();

    while (tokens[pos]?.toUpperCase() === "OR") {
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

export function asNumber(value: Value, operator: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Operator ${operator} can only be used with numbers`);
  }

  return value;
}

function requireArity(name: string, args: Value[], count: number) {
  if (args.length !== count) {
    throw new Error(`${name} expects ${count} argument${count === 1 ? "" : "s"}`);
  }
}

export function evaluateBuiltin(name: string, args: Value[]): Value {
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

export function parseExpressionSource(source: string): ASTNode {
  return parseExpression(tokenize(source));
}

export function evaluateBinary(operator: string, left: Value, right: Value): Value {
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
  throw new Error(`Unknown operator "${operator}"`);
}
