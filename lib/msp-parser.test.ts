import { describe, expect, it } from "vitest";

import { parseMiniScriptProgram } from "@/lib/msp-parser";

describe("parseMiniScriptProgram", () => {
  it("parses assignments, output, and nested loops into an AST", () => {
    const program = parseMiniScriptProgram(`
X = 0
WHILE X < N
  WHILE Y < N
    PRINT X
  END
  X = X + 1
END
`);

    expect(program.warnings).toEqual([]);
    expect(program.body).toHaveLength(2);
    expect(program.body[0]).toMatchObject({
      type: "assignment",
      line: 2,
      variable: "X",
      expression: { raw: "0" },
    });
    expect(program.body[1]).toMatchObject({
      type: "while",
      condition: { raw: "X < N" },
      body: [
        {
          type: "while",
          condition: { raw: "Y < N" },
          body: [
            {
              type: "print",
              expression: { raw: "X" },
            },
          ],
        },
        {
          type: "assignment",
          variable: "X",
          expression: { raw: "X + 1" },
        },
      ],
    });
  });

  it("keeps comment markers inside strings and strips inline comments", () => {
    const program = parseMiniScriptProgram(`
PRINT "A # B" # comment
PRINT "A // B" // comment
`);

    expect(program.warnings).toEqual([]);
    expect(program.body).toMatchObject([
      { type: "print", expression: { raw: '"A # B"' } },
      { type: "print", expression: { raw: '"A // B"' } },
    ]);
  });

  it("reports incomplete blocks as warnings", () => {
    const program = parseMiniScriptProgram(`
IF X > 0
  PRINT X
`);

    expect(program.body[0]).toMatchObject({
      type: "if",
      condition: { raw: "X > 0" },
    });
    expect(program.warnings).toEqual([
      { type: "missingThen", line: 2 },
      { type: "ifWithoutEnd", line: 2 },
    ]);
  });
});
