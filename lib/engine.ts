export type StepResult = {
  output: any;
  variables: Record<string, number>;
  currentLine: number;
} | null;

let variables: Record<string, number> = {};
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
  else if (line.includes("=")) {
    inst.type = "ASSIGN";
    let eqPos = line.indexOf("=");

    inst.var = trim(line.substring(0, eqPos));
    inst.value = trim(line.substring(eqPos + 1));
  }
  else if (line.startsWith("IF ")) {
    inst.type = "IF";

    let thenPos = line.indexOf("THEN");
    inst.condition = trim(line.substring(3, thenPos));
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

function getValue(x: string) {
  x = trim(x);

  if (variables.hasOwnProperty(x)) return variables[x];

  let num = Number(x);
  if (!isNaN(num)) return num;

  throw new Error("Invalid value: " + x);
}

function evaluate(expr: string) {
  expr = trim(expr);

  if (expr.includes("+")) {
    let pos = expr.indexOf("+");

    let left = trim(expr.substring(0, pos));
    let right = trim(expr.substring(pos + 1));

    return getValue(left) + getValue(right);
  }

  if (expr.includes("-")) {
    let pos = expr.indexOf("-");

    let left = trim(expr.substring(0, pos));
    let right = trim(expr.substring(pos + 1));

    return getValue(left) - getValue(right);
  }

  return getValue(expr);
}

function evaluateCondition(cond: string) {
  cond = trim(cond);

  if (cond.includes("<")) {
    let pos = cond.indexOf("<");

    let left = trim(cond.substring(0, pos));
    let right = trim(cond.substring(pos + 1));

    return getValue(left) < getValue(right);
  }

  if (cond.includes(">")) {
    let pos = cond.indexOf(">");

    let left = trim(cond.substring(0, pos));
    let right = trim(cond.substring(pos + 1));

    return getValue(left) > getValue(right);
  }

  return false;
}

export function step(program: any[]): StepResult {
  if (currentLine >= program.length) return null;

  let inst = program[currentLine];
  let output: any = null;

  if (inst.type === "ASSIGN") {
    variables[inst.var] = evaluate(inst.value);
  }

  else if (inst.type === "PRINT") {
    let val = trim(inst.value);

    if (variables[val] !== undefined) {
      output = variables[val];
    } else if (val.startsWith('"') && val.endsWith('"')) {
      output = val.slice(1, -1);
    } else {
      output = val;
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
      }
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