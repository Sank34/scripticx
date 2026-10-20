import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MiniScriptRuntime, parseLine, validateProgramSyntax } from "../engine";
import { getDocsPage, getExamplesPage, getExamplesPages, getExamplesSidebarPages } from "./docs";

function blocks(content: string) {
  return [...content.matchAll(/^```msp[^\n]*\n([\s\S]*?)^```/gm)].map(match => match[1]);
}
function execute(code: string, inputs: Array<number | string | boolean> = []) {
  const program = code.split("\n").map(parseLine);
  validateProgramSyntax(program);
  const runtime = new MiniScriptRuntime();
  const output = [];
  let next = 0;
  for (;;) {
    const event = runtime.step(program);
    if (!event) return output;
    if (event.output !== null) output.push(event.output);
    if (event.inputRequest) {
      if (next >= inputs.length) throw new Error("Missing example input");
      runtime.setVariable(event.inputRequest, inputs[next++]);
      runtime.advanceLine();
    }
  }
}

describe.each(["ro", "en"] as const)("runnable examples (%s)", locale => {
  const ro = locale === "ro";
  const outputs: Record<string, Array<Array<number | string | boolean>>> = {
    basics: [[ro ? "Salut" : "Hello", ro ? "ScripticX" : "World"], [5], [16], [ro ? "Mare" : "Large"]],
    conditions: [[ro ? "Cald" : "Warm"], [ro ? "Promovat" : "Passed"], [ro ? "Par" : "Even"], [8]],
    loops: [[0, 1, 2, 3, 4], [15], [5, 4, 3, 2, 1, 0], [6]],
    algorithms: [[ro ? "Prim" : "Prime"], [0, 1, 1, 2, 3], [4], [7]],
    "input-output": [[24, 20], ["0007", 4]],
    strings: [[6], ["radar", true], [2]],
    digits: [[3], [1221, true]],
    "number-bases": [["FE"], [13]],
    functions: [[13, 18, 4072], [120]],
  };
  for (const [slug, expected] of Object.entries(outputs)) {
    it(`runs every ${slug} example with its expected output`, () => {
      const programs = blocks(getExamplesPage(locale, slug)!.content);
      expect(programs).toHaveLength(expected.length);
      programs.forEach((program, i) => {
        const input = slug === "loops" && i === 3 ? [1, 2, 3] : slug === "input-output" ? i === 0 ? [6, 4] : ["0007"] : slug === "number-bases" ? ["1101"] : [];
        expect(execute(program, input)).toEqual(expected[i]);
      });
    });
  }
  it("handles the documented edge cases", () => {
    const algorithms = blocks(getExamplesPage(locale, "algorithms")!.content);
    for (const [n, prime] of [[0, false], [1, false], [2, true], [49, false], [97, true]] as const) {
      expect(execute(algorithms[0].replace("n = 7", `n = ${n}`))).toEqual([prime ? ro ? "Prim" : "Prime" : ro ? "Nu este prim" : "Not prime"]);
    }
    expect(execute(algorithms[2].replace(ro ? "alDoilea = 8" : "second = 8", ro ? "alDoilea = 0" : "second = 0"))).toEqual([12]);
    const strings = blocks(getExamplesPage(locale, "strings")!.content);
    expect(execute(strings[0].replace('"Ana are mere"', '""'))).toEqual([0]);
    expect(execute(strings[1].replace('"radar"', '""'))).toEqual(["", true]);
    expect(execute(strings[1].replace('"radar"', '"ab"'))).toEqual(["ba", false]);
    expect(execute(strings[2].replace('"banana"', '"aaaa"').replace('"ana"', '"aa"'))).toEqual([3]);
    expect(execute(strings[2].replace('"ana"', '""'))).toEqual([0]);
    expect(execute(strings[2].replace('"ana"', '"bananas"'))).toEqual([0]);
    const digits = blocks(getExamplesPage(locale, "digits")!.content);
    expect(execute(digits[0].replace("n = 4072", "n = 0"))).toEqual([1]);
    expect(execute(digits[1].replace("n = 1221", "n = 120"))).toEqual([21, false]);
    const bases = blocks(getExamplesPage(locale, "number-bases")!.content);
    for (const [n, hex] of [[0, "0"], [16, "10"], [255, "FF"], [256, "100"]] as const) {
      expect(execute(bases[0].replace("n = 254", `n = ${n}`))).toEqual([hex]);
    }
    for (const text of ["102", "", "1 1"]) expect(execute(bases[1], [text])).toEqual([ro ? "Reprezentare invalida" : "Invalid representation"]);
    expect(execute(bases[1], ["0011"])).toEqual([3]);
    const rectangle = blocks(getExamplesPage(locale, "input-output")!.content)[0];
    expect(execute(rectangle, [0, 4])).toEqual([ro ? "Laturi invalide" : "Invalid sides"]);
  });
  it("includes every translated example in navigation and resolves all lesson links", () => {
    const pages = getExamplesPages(locale);
    const navigation = getExamplesSidebarPages()[locale];
    expect(navigation).toHaveLength(pages.length);
    expect(pages.map(page => page.slug).sort()).toEqual(getExamplesPages(ro ? "en" : "ro").map(page => page.slug).sort());
    for (const page of pages) {
      expect(navigation).toContainEqual({ type: "doc", href: page.href, title: page.title });
      for (const program of blocks(page.content)) validateProgramSyntax(program.split("\n").map(parseLine));
      for (const match of page.content.matchAll(/\]\(\/(docs|examples)\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
        const linked = match[1] === "docs" ? getDocsPage(locale, match[2]) : getExamplesPage(locale, match[2]);
        expect(linked?.locale, `${page.slug} → ${match[2]}`).toBe(locale);
      }
    }
  });
});
