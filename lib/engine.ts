export type StepResult = {
  output: any;
  variables: Record<string, Value>;
  currentLine: number;
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

    inst.condition = condition;
  }
  else if (line === "ELSE") {
    inst.type = "ELSE";
  }
  else if (line.includes("=")) {
    inst.type = "ASSIGN";
    let eqPos = line.indexOf("=");

    inst.var = trim(line.substring(0, eqPos));
    inst.value = trim(line.substring(eqPos + 1));
  }
  else if (line === "END") {
    inst.type = "END";
  }
  else if (line.startsWith("WHILE ")) {
    inst.type = "WHILE";
    inst.condition = trim(line.substring(6));
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

  throw new Error("Invalid value: " + x);
}


function evaluate(expr: string) {
  expr = trim(expr);

  if (expr.includes("+")) {
    let pos = expr.indexOf("+");

    let left = getValue(expr.substring(0, pos));
    let right = getValue(expr.substring(pos + 1));

    // string => concatenare
    if (typeof left === "string" || typeof right === "string") {
      return String(left) + String(right);
    }

    return (left as number) + (right as number);
  }

  if (expr.includes("-")) {
    let pos = expr.indexOf("-");

    let left = getValue(expr.substring(0, pos));
    let right = getValue(expr.substring(pos + 1));

    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }

    throw new Error(`Invalid types for -: ${typeof left} and ${typeof right}`);
  }

  if (expr.includes("*")) {
    let pos = expr.indexOf("*");

    let left = getValue(expr.substring(0, pos));
    let right = getValue(expr.substring(pos + 1));

    if (typeof left === "number" && typeof right === "number") {
      return left * right;
    }

    throw new Error(`Invalid types for *: ${typeof left} and ${typeof right}`);
  }

  if (expr.includes("/")) {
    let pos = expr.indexOf("/");

    let left = getValue(expr.substring(0, pos));
    let right = getValue(expr.substring(pos + 1));

    if (typeof left === "number" && typeof right === "number") {
      return left / right;
    }

    throw new Error(`Invalid types for /: ${typeof left} and ${typeof right}`);
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

  if ((pos = cond.indexOf(">=")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 2));
    return left >= right;
  }

  if ((pos = cond.indexOf("<=")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 2));
    return left <= right;
  }

  if ((pos = cond.indexOf("==")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 2));
    return left === right;
  }

  if ((pos = cond.indexOf("!=")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 2));
    return left !== right;
  }

  if ((pos = cond.indexOf(">")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 1));
    return left > right;
  }

  if ((pos = cond.indexOf("<")) !== -1) {
    let left = getValue(cond.substring(0, pos));
    let right = getValue(cond.substring(pos + 1));
    return left < right;
  }

  return false;
}
export function step(program: any[]): StepResult {
  if (currentLine >= program.length) return null;

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
        line: currentLine
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
        line: currentLine
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
  }

  currentLine++;

  return {
    output,
    variables: { ...variables },
    currentLine
  };
}