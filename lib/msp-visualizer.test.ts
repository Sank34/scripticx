import { describe, expect, it } from "vitest";

import { visualizeMiniScript } from "@/lib/msp-visualizer";

describe("visualizeMiniScript", () => {
  it("renders AST and flowchart text from parsed code", () => {
    const result = visualizeMiniScript(`
X = 0
WHILE X < 3
  PRINT X
  X = X + 1
END
`);

    expect(result.warnings).toEqual([]);
    expect(result.ast).toContain("- Program");
    expect(result.ast).toContain("  - Assignment: X = 0");
    expect(result.ast).toContain("  - While: X < 3");
    expect(result.ast).toContain("    - Print: X");
    expect(result.flowchart).toContain("- Start");
    expect(result.flowchart).toContain("  - Loop condition: X < 3 ?");
    expect(result.flowchart).toContain("    - Repeat loop");
    expect(result.flowchart).toContain("- End");
  });
});
