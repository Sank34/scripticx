import { compileProgram, type Instruction } from "./miniscript/compiler";
import { MiniScriptRuntime, type ExecutionStep } from "./miniscript/runtime";
import type { Value } from "./miniscript/expressions";

export { parseLine } from "./miniscript/compiler";
export { MiniScriptRuntime } from "./miniscript/runtime";
export type StepResult = ExecutionStep | null;

let runtime = new MiniScriptRuntime();
export function reset() { runtime = new MiniScriptRuntime(); }
export function setVariable(name: string, value: Value) { runtime.setVariable(name, value); }
export function advanceLine() { runtime.advanceLine(); }
export function step(program: readonly Instruction[]): StepResult { return runtime.step(program); }
export function validateProgram(program: readonly Instruction[]) { compileProgram(program); }
export function validateProgramSyntax(program: readonly Instruction[]) { compileProgram(program, true); }
