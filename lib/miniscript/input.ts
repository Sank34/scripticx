import type { Value } from "./expressions";

export function parseMiniScriptInput(value: string): Value {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value;
    }
  }
  if (value === "true" || value === "false") return value === "true";
  if (value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return value;
}
