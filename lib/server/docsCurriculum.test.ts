import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MiniScriptRuntime, parseLine, validateProgramSyntax } from "../engine";
import { getDocsPage, getDocsPages, getDocsSidebarPages } from "./docs";

function blocks(content: string) {
  return [...content.matchAll(/^```msp[^\n]*\n([\s\S]*?)^```/gm)].map(match => match[1]);
}
function execute(code: string, input: Array<number | string | boolean> = []) {
  const program = code.split("\n").map(parseLine);
  validateProgramSyntax(program);
  const runtime = new MiniScriptRuntime();
  const output = [];
  let nextInput = 0;
  for (;;) {
    const event = runtime.step(program);
    if (!event) return output;
    if (event.output !== null) output.push(event.output);
    if (event.inputRequest) {
      if (nextInput >= input.length) throw new Error("Missing input");
      runtime.setVariable(event.inputRequest, input[nextInput++]);
      runtime.advanceLine();
    }
  }
}

describe.each(["en", "ro"] as const)("MiniScript+ curriculum (%s)", locale => {
  const examples: Record<string, Array<{ input?: number[]; output: Array<number | string | boolean> }>> = {
    operators: [{ output: [4, 3, 4.6] }, { output: [14, 20, 12] }],
    conditions: [
      { input: [8], output: [locale === "ro" ? "par" : "even"] },
      { input: [0], output: ["zero"] },
      { input: [18, 4], output: [4.5] },
    ],
    aggregates: [{ input: [3, 8, -2, 5, 0], output: [6, 3] }, { input: [-9, -4, -12, -7], output: [-4] }],
    digits: [{ output: [13, 4072] }, { output: [4021] }],
    divisibility: [{ output: [1, 2, 3, 6, 9, 18] }, { output: [true] }, { output: [6] }],
    sequences: [{ output: [3, 7, 11, 15] }, { output: [0, 1, 1, 2, 3, 5, 8] }],
    "number-bases": [{ output: [13] }, { output: ["1101"] }],
    functions: [{ output: [12, 11] }, { output: [20, 10] }],
    recursion: [{ output: [120] }],
  };

  for (const [slug, cases] of Object.entries(examples)) {
    it(`executes all ${slug} examples with the published results`, () => {
      const programs = blocks(getDocsPage(locale, slug)!.content);
      expect(programs).toHaveLength(cases.length);
      programs.forEach((code, i) => expect(execute(code, cases[i].input)).toEqual(cases[i].output));
    });
  }

  it("checks boundary cases in decisions, primality, digits, and bases", () => {
    expect(execute("PRINT FALSE AND 1 / 0 > 2\nPRINT TRUE OR 1 / 0 > 2")).toEqual([false, true]);
    const decisions = blocks(getDocsPage(locale, "conditions")!.content);
    expect(execute(decisions[0], [9])).toEqual([locale === "ro" ? "impar" : "odd"]);
    expect(execute(decisions[1], [-1])).toEqual([locale === "ro" ? "negativ" : "negative"]);
    expect(execute(decisions[1], [1])).toEqual([locale === "ro" ? "pozitiv" : "positive"]);
    expect(execute(decisions[2], [0, 0])).toEqual([locale === "ro" ? "Nu exista valori." : "There are no values."]);
    const primality = blocks(getDocsPage(locale, "divisibility")!.content)[1];
    for (const [n, prime] of [[0, false], [1, false], [2, true], [4, false], [49, false], [97, true]] as const) {
      expect(execute(primality.replace("n = 29", `n = ${n}`))).toEqual([prime]);
    }
    const reverse = blocks(getDocsPage(locale, "digits")!.content)[1];
    expect(execute(reverse.replace("n = 1204", "n = 1200"))).toEqual([21]);
    expect(execute(reverse.replace("n = 1204", "n = 0"))).toEqual([0]);
    const binary = blocks(getDocsPage(locale, "number-bases")!.content)[1];
    for (const [n, representation] of [[0, "0"], [1, "1"], [8, "1000"], [15, "1111"]] as const) {
      expect(execute(binary.replace("n = 13", `n = ${n}`))).toEqual([representation]);
    }
  });

  it("has translated pages, valid internal links, and every page in the platform sidebar", () => {
    const pages = getDocsPages(locale);
    const other = getDocsPages(locale === "ro" ? "en" : "ro");
    expect(pages.map(page => page.slug).sort()).toEqual(other.map(page => page.slug).sort());
    expect(new Set(pages.map(page => page.slug)).size).toBe(pages.length);
    const navigation = getDocsSidebarPages()[locale];
    expect(navigation).toHaveLength(pages.length);
    for (const page of pages) {
      expect(navigation).toContainEqual({ type: "doc", href: page.href, title: page.title });
      for (const match of page.content.matchAll(/\]\(\/docs\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
        expect(getDocsPage(locale, match[1]), `${page.slug} → ${match[1]}`).not.toBeNull();
      }
      for (const program of blocks(page.content)) validateProgramSyntax(program.split("\n").map(parseLine));
    }
  });

  it("includes every ASCII code exactly once in the complete table", () => {
    const content = getDocsPage(locale, "strings")!.content;
    const rows = content.split("\n").filter(line => /^\| \d+ \|/.test(line) && line.split("|").length >= 9);
    expect(rows).toHaveLength(32);
    const codes = rows.flatMap(row => [...row.matchAll(/(?:^|\|)\s*(\d+)\s*\|/g)].map(match => Number(match[1])));
    expect(codes.sort((a, b) => a - b)).toEqual(Array.from({ length: 128 }, (_, i) => i));
  });
});
