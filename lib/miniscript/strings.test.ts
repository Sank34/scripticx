import { describe, expect, it } from "vitest";
import { evaluateBuiltin } from "./expressions";
import { parseMiniScriptInput } from "./input";

describe("text input", () => {
  it.each([
    ["", ""], ["  ", "  "], ["i love bananas", "i love bananas"],
    ['"00123"', "00123"], ['"true"', "true"], ['""', ""], ['"a\\nb"', "a\nb"],
    ["12", 12], ["-2.5", -2.5], ["true", true], ["false", false],
    ["Infinity", "Infinity"], ['"a\\q"', '"a\\q"'],
  ])("parses %j as %j", (input, expected) => {
    expect(parseMiniScriptInput(input)).toBe(expected);
  });
});

describe("Unicode character codes", () => {
  it.each([0, 97, 537, 0xd7ff, 0xe000, 0x1f600, 0x10ffff])("round-trips scalar %i", code => {
    expect(evaluateBuiltin("ORD", [evaluateBuiltin("CHR", [code])])).toBe(code);
  });
  it("rejects lone surrogate code points", () => {
    expect(() => evaluateBuiltin("ORD", ["\ud800"])).toThrow("surrogate");
  });
  it("has an exact inverse for each encrypted character with the repeated key", () => {
    const source = "i love bananas șț😀\u0000";
    const key = Array.from("le papoi");
    const encrypted = Array.from(source, (char, index) =>
      Number(evaluateBuiltin("ORD", [char])) * key[index % key.length].codePointAt(0)! + 1);
    const decoded = encrypted.map((code, index) =>
      evaluateBuiltin("CHR", [(code - 1) / key[index % key.length].codePointAt(0)!])).join("");
    expect(decoded).toBe(source);
  });
});


it("searches complete Unicode code points without matching half of an emoji", () => {
  expect(evaluateBuiltin("FIND", ["😀a😀b", "😀b"])).toBe(2);
  expect(evaluateBuiltin("FIND", ["😀", "\ud800"])).toBe(-1);
  expect(evaluateBuiltin("FIND", ["😀", "\ude00"])).toBe(-1);
});
