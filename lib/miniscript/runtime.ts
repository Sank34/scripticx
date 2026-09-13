import { BUILTINS, compileProgram, lineError, type CompiledProgram, type Instruction } from "./compiler";
import { asNumber, evaluateBinary, evaluateBuiltin, parseExpressionSource, type ASTNode, type Value } from "./expressions";

export type ExecutionStep = {
  output: Value | null;
  variables: Record<string, Value>;
  currentLine: number;
  executedLine: number;
  inputRequest?: string;
};
type Scope = Map<string, Value>;
type Execution<T> = Generator<ExecutionStep, T, void>;
type ForState = { bound: number; increment: number };

export class MiniScriptRuntime {
  private globals: Scope = new Map();
  private scopes: Scope[] = [this.globals];
  private iterator?: Execution<void>;
  private compiled?: CompiledProgram;
  private steps = 0;
  private inputReady = false;
  private pendingInput?: { name: string; line: number };
  constructor(private readonly maxSteps = 1000, private readonly maxCallDepth = 64) {}

  setVariable(name: string, value: Value) { this.scopes.at(-1)!.set(name, value); }
  advanceLine() { if (this.pendingInput) this.inputReady = true; }
  private snapshot() { return Object.fromEntries([...this.globals, ...this.scopes.at(-1)!]); }
  private event(line: number, next: number, output: Value | null = null): ExecutionStep {
    return { output, variables: this.snapshot(), executedLine: line + 1, currentLine: next };
  }
  step(program: readonly Instruction[]): ExecutionStep | null {
    if (!this.compiled) {
      this.compiled = compileProgram(program);
      this.iterator = this.run();
    } else if (this.compiled.instructions !== program) {
      throw new Error("Reset the runtime before running a different program");
    }
    if (this.pendingInput && !this.inputReady) {
      return { ...this.event(this.pendingInput.line, this.pendingInput.line), inputRequest: this.pendingInput.name };
    }
    const next = this.iterator!.next();
    if (next.done) return null;
    if (++this.steps > this.maxSteps) throw lineError("Possible infinite loop detected", next.value.executedLine);
    return next.value;
  }
  private *run(): Execution<void> { yield* this.runRange(0, this.compiled!.instructions.length, undefined); }
  private required(value: Value | undefined): Value {
    if (value === undefined) throw new Error("Function did not return a value");
    return value;
  }
  private *expression(source: string, line: number): Execution<Value> {
    let ast = this.compiled!.expressions.get(source);
    if (!ast) { ast = parseExpressionSource(source); this.compiled!.expressions.set(source, ast); }
    return this.required(yield* this.evaluate(ast, line));
  }
  private *evaluate(node: ASTNode, line: number): Execution<Value | undefined> {
    if (node.type === "number" || node.type === "string" || node.type === "boolean") return node.value;
    if (node.type === "variable") {
      const local = this.scopes.at(-1)!;
      if (local.has(node.name)) return local.get(node.name)!;
      if (this.globals.has(node.name)) return this.globals.get(node.name)!;
      throw new Error(`Variable "${node.name}" is not defined`);
    }
    if (node.type === "unary") {
      const value = this.required(yield* this.evaluate(node.value, line));
      if (node.operator === "NOT") return !value;
      if (typeof value !== "number") throw new Error("Unary minus can only be used with numbers");
      return -value;
    }
    if (node.type === "binary") {
      const left = this.required(yield* this.evaluate(node.left, line));
      const operator = node.operator.toUpperCase();
      if (operator === "AND" && !left) return false;
      if (operator === "OR" && left) return true;
      return evaluateBinary(operator, left, this.required(yield* this.evaluate(node.right, line)));
    }
    const args: Value[] = [];
    for (const arg of node.args) args.push(this.required(yield* this.evaluate(arg, line)));
    if (BUILTINS.has(node.name.toUpperCase())) return evaluateBuiltin(node.name, args);
    const definition = this.compiled!.functions.get(node.name);
    if (!definition) throw new Error(`Unknown function "${node.name}"`);
    if (definition.params.length !== args.length) throw new Error(`${node.name} expects ${definition.params.length} arguments`);
    if (this.scopes.length > this.maxCallDepth) throw new Error("Maximum function call depth exceeded");
    this.scopes.push(new Map(definition.params.map((name, index) => [name, args[index]])));
    try {
      yield this.event(line, definition.start + 1);
      return yield* this.runRange(definition.start + 1, definition.end + 1, line);
    } finally { this.scopes.pop(); }
  }
  private *runRange(start: number, end: number, caller: number | undefined): Execution<Value | undefined> {
    const { instructions, ends, starts, alternatives } = this.compiled!;
    const loops = new Map<number, ForState>();
    let pc = start;
    while (pc < end) {
      const line = pc;
      const instruction = instructions[line];
      let next = pc + 1;
      let output: Value | null = null;
      try {
        switch (instruction.type) {
          case "EMPTY": break;
          case "ERROR": throw new Error(instruction.message);
          case "FUNCTION": next = ends.get(line)! + 1; break;
          case "ASSIGN": this.setVariable(instruction.var, yield* this.expression(instruction.value, line)); break;
          case "PRINT": output = yield* this.expression(instruction.value, line); break;
          case "CALL": {
            const ast = parseExpressionSource(instruction.value);
            if (ast.type !== "call") throw new Error("Expected a function call");
            yield* this.evaluate(ast, line);
            break;
          }
          case "RETURN": {
            const value = instruction.value ? yield* this.expression(instruction.value, line) : undefined;
            yield this.event(line, caller!);
            return value;
          }
          case "INPUT": {
            this.pendingInput = { name: instruction.var, line };
            this.inputReady = false;
            yield { ...this.event(line, line), inputRequest: instruction.var };
            this.pendingInput = undefined;
            this.inputReady = false;
            pc = next;
            continue;
          }
          case "IF":
            if (!(yield* this.expression(instruction.condition, line))) next = (alternatives.get(line) ?? ends.get(line)!) + 1;
            break;
          case "ELSE": next = ends.get(line)! + 1; break;
          case "WHILE":
            if (!(yield* this.expression(instruction.condition, line))) next = ends.get(line)! + 1;
            break;
          case "FOR": {
            let state = loops.get(line);
            if (!state) {
              const initial = asNumber(yield* this.expression(instruction.from, line), "FOR");
              const bound = asNumber(yield* this.expression(instruction.to, line), "FOR");
              const increment = asNumber(yield* this.expression(instruction.increment, line), "INCR");
              if (increment === 0) throw new Error("FOR increment cannot be zero");
              state = { bound, increment };
              loops.set(line, state);
              this.setVariable(instruction.var, initial);
            }
            const value = asNumber(this.scopes.at(-1)!.get(instruction.var)!, "FOR");
            if (state.increment > 0 ? value > state.bound : value < state.bound) {
              loops.delete(line);
              next = ends.get(line)! + 1;
            }
            break;
          }
          case "END": {
            const opening = starts.get(line)!;
            const block = instructions[opening];
            if (block.type === "FUNCTION") { yield this.event(line, caller!); return undefined; }
            if (block.type === "WHILE") next = opening;
            if (block.type === "FOR") {
              const state = loops.get(opening)!;
              const value = asNumber(this.scopes.at(-1)!.get(block.var)!, "FOR");
              const incremented = value + state.increment;
              if (!Number.isFinite(incremented) || incremented === value) throw new Error("FOR increment cannot advance the variable");
              this.setVariable(block.var, incremented);
              next = opening;
            }
            break;
          }
        }
        yield this.event(line, next, output);
        pc = next;
      } catch (error) {
        if (error instanceof Error && "line" in error) throw error;
        throw lineError(error instanceof Error ? error.message : "Execution failed", line + 1);
      }
    }
    return undefined;
  }
}
