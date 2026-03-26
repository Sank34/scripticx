export type StepResult = {
  output: any;
  variables: Record<string, Value>;
  currentLine: number;
  inputRequest?: string;
} | null;

type Value = string | number | boolean;

let variables: Record<string, Value> = {};
let currentLine = 0;

export function reset() {
  variables = {};
  currentLine = 0;
}

function trim(str: string) {
  return str.trim();
}

function normalizeOperators(str: string) {
  //since the font convers "<=" to the character ≤ we'll need to convert it (normalize)
  return str
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=");
}

export function setVariable(name: string, value: Value) {
  variables[name] = value;
}

export function advanceLine() {
  currentLine++;
}

function splitTopLevel(expr: string, operator: string): string[] {
  let result: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (char === "(") depth++;
    if (char === ")") depth--;

    if (char === operator && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) result.push(current);

  return result;
}

export function parseLine(line: string) {
  line = trim(line);

  if (line.trim().startsWith("#")) {
    return { type: "EMPTY" };
  }

  if (line.includes("#")) {
    line = line.split("#")[0].trim();
  }

  if (line === "") {
    return { type: "EMPTY" };
  }

  let inst: any = {
    type: "",
    var: "",
    value: "",
    condition: ""
  };

  if (line.startsWith("PRINT ")) {
    inst.type = "PRINT";
    inst.value = trim(line.substring(6));
  }
  else if (line.startsWith("IF ")) {
    inst.type = "IF";

    let condition = line.substring(3).trim();
    condition = condition.replace("THEN", "").trim();

    inst.condition = normalizeOperators(condition);
  }
  else if (line.startsWith("WHILE ")) {
    inst.type = "WHILE";
    inst.condition = normalizeOperators(trim(line.substring(6)));
  }
  else if (line === "ELSE") {
    inst.type = "ELSE";
  }
  else if (line === "END") {
    inst.type = "END";
  }
  else if (line.startsWith("INPUT ")) {
    inst.type = "INPUT";
    inst.var = trim(line.substring(6));
  }
  else if (line.includes("=")) {
    inst.type = "ASSIGN";

    let eqPos = line.indexOf("=");

    inst.var = trim(line.substring(0, eqPos));
    inst.value = trim(line.substring(eqPos + 1));
  }

  return inst;
}


function getValue(x: string): Value {
  x = trim(x);

  // variable
  if (variables.hasOwnProperty(x)) return variables[x];

  // boolean
  if (x === "true") return true;
  if (x === "false") return false;

  // string
  if (x.startsWith('"') && x.endsWith('"')) {
    return x.slice(1, -1);
  }

  // number
  let num = Number(x);
  if (!isNaN(num)) return num;

  throw new Error(`Variable "${x}" is not defined`);
}


function evaluate(expr: string): Value {
  expr = trim(expr);

  if (expr.startsWith("(") && expr.endsWith(")")) {
    let depth = 0;
    let isWrapped = true;

    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") depth++;
      if (expr[i] === ")") depth--;

      if (depth === 0 && i < expr.length - 1) {
        isWrapped = false;
        break;
      }
    }

    if (isWrapped) {
      return evaluate(expr.slice(1, -1));
    }
  }

  const plusParts = splitTopLevel(expr, "+");
  if (plusParts.length > 1) {
    const values = plusParts.map(p => evaluate(p));

    if (values.some(v => typeof v === "string")) {
      return values.map(v => String(v)).join("");
    }

    return values.reduce((a, b) => (a as number) + (b as number), 0);
  }

  const minusParts = splitTopLevel(expr, "-");
  if (minusParts.length > 1) {
    const values = minusParts.map(p => evaluate(p));
    return values.reduce((a, b) => (a as number) - (b as number));
  }

  const mulParts = splitTopLevel(expr, "*");
  if (mulParts.length > 1) {
    const values = mulParts.map(p => evaluate(p));
    return values.reduce((a, b) => (a as number) * (b as number));
  }

  const divParts = splitTopLevel(expr, "/");
  if (divParts.length > 1) {
    const values = divParts.map(p => evaluate(p));
    return values.reduce((a, b) => (a as number) / (b as number));
  }

  return getValue(expr);
}

function evaluateCondition(cond: string):boolean {
  cond = trim(cond);

  // logical operators

  if (cond.startsWith("NOT ")) {
    return !evaluateCondition(cond.substring(4));
  }

  if (cond.includes(" AND ")) {
    let parts = cond.split(" AND ");

    return parts.every(part => evaluateCondition(part));
  }

  if (cond.includes(" OR ")) {
    let parts = cond.split(" OR ");

    return parts.some(part => evaluateCondition(part));
  }

  let pos;
  cond = normalizeOperators(cond);
  if ((pos = cond.indexOf(">=")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 2));
    return left >= right;
  }

  if ((pos = cond.indexOf("<=")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 2));
    return left <= right;
  }

  if ((pos = cond.indexOf("==")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 2));
    return left === right;
  }

  if ((pos = cond.indexOf("!=")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 2));
    return left !== right;
  }

  if ((pos = cond.indexOf(">")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 1));
    return left > right;
  }

  if ((pos = cond.indexOf("<")) !== -1) {
    let left = evaluate(cond.substring(0, pos));
    let right = evaluate(cond.substring(pos + 1));
    return left < right;
  }

  return false;
}
export function step(program: any[]): StepResult {
  if (currentLine >= program.length) return null;

  let steps = 0;
  const MAX_STEPS = 1000;

  steps++;
  if (steps > MAX_STEPS) {
    throw {
      message: "Possible infinite loop detected",
      line: currentLine + 1
    };
  }

  let inst = program[currentLine];
  let output: any = null;

  if (inst.type === "EMPTY") {
    currentLine++;

    return {
      output: null,
      variables: { ...variables },
      currentLine
    };
  } 
  else if (inst.type === "ASSIGN") {
    try {
      variables[inst.var] = evaluate(inst.value);
    } catch (e: any) {
      throw {
        message: e.message,
        line: currentLine+1
      };
    }
  } 
  else if (inst.type === "PRINT") {
    let val = trim(inst.value);

    try {
      output = evaluate(val);
    } catch (e: any) {
      throw {
        message: e.message,
        line: currentLine+1
      };
    }
  }

  else if (inst.type === "IF") {
    let res = evaluateCondition(inst.condition);

    if (!res) {
      let depth = 1;

      while (depth > 0) {
        currentLine++;

        if (program[currentLine].type === "IF") depth++;
        if (program[currentLine].type === "END") depth--;

        if (depth === 1 && program[currentLine].type === "ELSE") {
          break;
        }
      }
    }
  }
  else if (inst.type === "ELSE") {
    let depth = 1;

    while (depth > 0) {
      currentLine++;

      if (program[currentLine].type === "IF") depth++;
      if (program[currentLine].type === "END") depth--;
    }
  }
  else if (inst.type === "WHILE") {
    let res = evaluateCondition(inst.condition);

    if (!res) {
      let depth = 1;

      while (depth > 0) {
        currentLine++;

        if (program[currentLine].type === "WHILE") depth++;
        if (program[currentLine].type === "END") depth--;
      }
    }
  }

  else if (inst.type === "END") {
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
    currentLine++;
    return {
      output: null,
      variables: { ...variables },
      currentLine,
      inputRequest: inst.var
    };
  }

  currentLine++;

  return {
    output,
    variables: { ...variables },
    currentLine
  };
}