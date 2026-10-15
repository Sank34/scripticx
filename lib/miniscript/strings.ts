import type { Value } from "./expressions";

export const STRING_FUNCTIONS: Record<string, { parameters: string[]; description: string }> = {
  LEN: { parameters: ["text"], description: "Count Unicode code points in text." },
  CHAR: { parameters: ["text", "index"], description: "Read one character at a zero-based index; out-of-range indices are errors." },
  SUBSTR: { parameters: ["text", "start", "count"], description: "Read up to count characters from a zero-based start; start may equal LEN(text)." },
  FIND: { parameters: ["text", "search"], description: "Find the first occurrence; return a zero-based index or -1." },
  ORD: { parameters: ["character"], description: "Return the Unicode scalar value of exactly one character." },
  CHR: { parameters: ["code"], description: "Convert a Unicode scalar value to one character." },
  LOWER: { parameters: ["text"], description: "Convert text to lowercase without locale-specific rules." },
  UPPER: { parameters: ["text"], description: "Convert text to uppercase without locale-specific rules." },
  STR: { parameters: ["value"], description: "Convert a number, boolean or string to text." },
};

function text(value: Value, name: string): string {
  if (typeof value !== "string") throw new Error(`${name} expects a string`);
  return value;
}

function nonNegativeInteger(value: Value, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} expects a non-negative safe integer`);
  }
  return value;
}

export function evaluateStringBuiltin(name: string, args: Value[]): Value {
  const definition = Object.hasOwn(STRING_FUNCTIONS, name) ? STRING_FUNCTIONS[name] : undefined;
  if (!definition) throw new Error(`Unknown function "${name}"`);
  const arity = definition.parameters.length;
  if (args.length !== arity) throw new Error(`${name} expects ${arity} argument${arity === 1 ? "" : "s"}`);

  switch (name) {
    case "STR": return String(args[0]);
    case "LOWER": return text(args[0], name).toLowerCase();
    case "UPPER": return text(args[0], name).toUpperCase();
    case "LEN": return Array.from(text(args[0], name)).length;
    case "CHAR": {
      const chars = Array.from(text(args[0], name));
      const index = nonNegativeInteger(args[1], name);
      if (index >= chars.length) throw new Error("CHAR index is out of range");
      return chars[index];
    }
    case "SUBSTR": {
      const chars = Array.from(text(args[0], name));
      const start = nonNegativeInteger(args[1], name);
      const count = nonNegativeInteger(args[2], name);
      if (start > chars.length) throw new Error("SUBSTR start is out of range");
      return chars.slice(start, start + Math.min(count, chars.length - start)).join("");
    }
    case "FIND": {
      const source = Array.from(text(args[0], name));
      const search = Array.from(text(args[1], name));
      for (let i = 0; i <= source.length - search.length; i++) {
        if (search.every((char, offset) => source[i + offset] === char)) return i;
      }
      return -1;
    }
    case "ORD": {
      const chars = Array.from(text(args[0], name));
      if (chars.length !== 1) throw new Error("ORD expects exactly one Unicode character");
      const code = chars[0].codePointAt(0)!;
      if (code >= 0xd800 && code <= 0xdfff) throw new Error("ORD does not accept surrogate code points");
      return code;
    }
    case "CHR": {
      const code = nonNegativeInteger(args[0], name);
      if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        throw new Error("CHR expects a Unicode scalar value (0..1114111, excluding surrogates)");
      }
      return String.fromCodePoint(code);
    }
    default: throw new Error(`Unknown function "${name}"`);
  }
}
