import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MiniScriptRuntime, parseLine, validateProgramSyntax } from "../engine";
import { flattenDocsNavigation } from "../docs-content";
import { parseMiniScriptInput } from "../miniscript/input";
import { STRING_FUNCTIONS } from "../miniscript/strings";
import {
  getDocsLocalizedPage, getDocsNavigation, getDocsPage, getDocsStaticParams,
  getExamplesLocalizedPage, getExamplesNavigation, getExamplesPage, getExamplesStaticParams,
} from "./docs";

function codeBlocks(content: string) {
  return [...content.matchAll(/^```msp[^\n]*\n([\s\S]*?)^```/gm)].map(match => match[1]);
}

function run(code: string, input: Array<string | number | boolean> = []) {
  const program = code.split("\n").map(parseLine);
  validateProgramSyntax(program);
  const runtime = new MiniScriptRuntime();
  const output: Array<string | number | boolean> = [];
  let inputIndex = 0;
  for (;;) {
    const event = runtime.step(program);
    if (!event) return output;
    if (event.output !== null) output.push(event.output);
    if (event.inputRequest) {
      if (inputIndex >= input.length) throw new Error("Missing test input");
      runtime.setVariable(event.inputRequest, input[inputIndex++]);
      runtime.advanceLine();
    }
  }
}

const ciphertext = "11156 9507 10693 11350 11369";

describe.each(["en", "ro"] as const)("public string documentation (%s)", locale => {
  it("loads the selected translation and includes both pages in navigation and routes", () => {
    const docs = getDocsLocalizedPage("strings")[locale];
    const example = getExamplesLocalizedPage("string-encryption")[locale];
    expect(docs?.locale).toBe(locale);
    expect(docs?.title).toBe(locale === "ro" ? "Șiruri de caractere" : "Strings");
    expect(example?.locale).toBe(locale);
    expect(example?.title).toBe(locale === "ro" ? "Codificarea textului cu o cheie" : "Encode text with a key");
    expect(docs?.description).toBeTruthy();
    expect(example?.description).toBeTruthy();
    expect(flattenDocsNavigation(getDocsNavigation(locale))).toContainEqual({ type: "doc", title: docs!.title, href: "/docs/strings" });
    expect(flattenDocsNavigation(getExamplesNavigation(locale))).toContainEqual({ type: "doc", title: example!.title, href: "/examples/string-encryption" });
    expect(getDocsStaticParams()).toContainEqual({ slug: ["strings"] });
    expect(getExamplesStaticParams()).toContainEqual({ slug: ["string-encryption"] });
  });

  it("runs every string guide program and checks its output", () => {
    const page = getDocsPage(locale, "strings")!;
    const blocks = codeBlocks(page.content);
    expect(blocks).toHaveLength(6);
    expect(run(blocks[0], [parseMiniScriptInput("i love bananas")])).toEqual([14]);
    expect(run(blocks[0], [parseMiniScriptInput('"00123"')])).toEqual([5]);
    expect(run(blocks[0], [parseMiniScriptInput("")])).toEqual([0]);
    expect(run(blocks[0], [parseMiniScriptInput(" ")])).toEqual([1]);
    expect(run(blocks[1])).toEqual(locale === "ro" ? ["Salut, Mara!", "Puncte: 12"] : ["Hello, Mara!", "Points: 12"]);
    expect(run(blocks[2])).toEqual([6, "b", "ana", 2]);
    expect(run(blocks[3])).toEqual([3]);
    expect(run(blocks[4])).toEqual(["bonana"]);
    expect(run(blocks[5])).toEqual([3, "😀", 259, "ă", "ȘȚABC", "șțabc"]);
    for (const name of Object.keys(STRING_FUNCTIONS)) expect(page.content).toContain(`\`${name}(`);
  });

  it("runs the published encoding and inverse examples through the runtime", () => {
    const page = getExamplesPage(locale, "string-encryption")!;
    const blocks = codeBlocks(page.content);
    expect(blocks).toHaveLength(2);
    expect(run(blocks[0], ["salut", "abc"])).toEqual([ciphertext]);
    expect(run(blocks[0], ["salut", "x"])).toEqual(["13801 11641 12961 14041 13921"]);
    expect(run(blocks[0], ["", "abc"])).toEqual([""]);
    expect(run(blocks[0], [" ", "a"])).toEqual(["3105"]);
    expect(run(blocks[0], ["😀", "K"])).toEqual(["9638401"]);
    expect(run(blocks[0], ["salut", ""])).toEqual([locale === "ro" ? "Cheia nu poate fi goală." : "The key cannot be empty."]);
    expect(run(blocks[0], ["salut", "a\u0000"])).toEqual([locale === "ro" ? "Cheia nu poate conține caracterul cu codul 0." : "The key cannot contain the character with code 0."]);
    const text = "aă😀 ".repeat(12) + "xy";
    const key = Array.from("ș 😀");
    const expected = Array.from(text, (char, i) => String(char.codePointAt(0)! * key[i % key.length].codePointAt(0)! + 1)).join(" ");
    expect(run(blocks[0], [text, key.join("")])).toEqual([expected]);
    expect(run(blocks[1])).toEqual(["s"]);
    expect(page.content).toContain(ciphertext);
  });

  it("keeps the updated loop examples valid and the input examples executable", () => {
    for (const block of codeBlocks(getDocsPage(locale, "loops")!.content)) {
      validateProgramSyntax(block.split("\n").map(parseLine));
    }
    const blocks = codeBlocks(getDocsPage(locale, "input-output")!.content);
    expect(blocks).toHaveLength(5);
    expect(run(blocks[0])).toEqual([locale === "ro" ? "Elev:" : "Student:", "Mara", 100]);
    expect(run(blocks[1], [16])).toEqual([16]);
    expect(run(blocks[2], ["i love bananas"])).toEqual([14]);
    expect(run(blocks[3], [2, 3])).toEqual(locale === "ro" ? ["Primul număr:", "Al doilea număr:", "Suma:", 5] : ["First number:", "Second number:", "Sum:", 5]);
    expect(run(blocks[4], [1, 2, 3])).toEqual([6]);
  });

  it("resolves links in the new pages without falling back to another locale", () => {
    const pages = [getDocsPage(locale, "strings")!, getExamplesPage(locale, "string-encryption")!];
    for (const page of pages) {
      for (const match of page.content.matchAll(/\]\(\/(docs|examples)\/([^\s)]+)\)/g)) {
        const linked = match[1] === "docs" ? getDocsPage(locale, match[2]) : getExamplesPage(locale, match[2]);
        expect(linked?.locale).toBe(locale);
      }
    }
  });
});
