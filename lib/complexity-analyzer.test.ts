import { describe, expect, it } from "vitest";

import { analyzeMiniScriptComplexity } from "@/lib/complexity-analyzer";

describe("analyzeMiniScriptComplexity", () => {
  it("keeps straight-line code constant", () => {
    const analysis = analyzeMiniScriptComplexity(`
X = 1
Y = X + 2
PRINT Y
`);

    expect(analysis.timeComplexity).toBe("O(1)");
    expect(analysis.spaceComplexity).toBe("O(1)");
    expect(analysis.loopCount).toBe(0);
    expect(analysis.maxNestedLoops).toBe(0);
    expect(analysis.level).toBe("excellent");
  });

  it("detects a single loop as linear", () => {
    const analysis = analyzeMiniScriptComplexity(`
X = 0
WHILE X < N
  PRINT X
  X = X + 1
END
`);

    expect(analysis.timeComplexity).toBe("O(n)");
    expect(analysis.spaceComplexity).toBe("O(1)");
    expect(analysis.loopCount).toBe(1);
    expect(analysis.maxNestedLoops).toBe(1);
    expect(analysis.hasInputDependentLoop).toBe(true);
  });

  it("detects nested loops as quadratic", () => {
    const analysis = analyzeMiniScriptComplexity(`
X = 0
WHILE X < N
  Y = 0
  WHILE Y < N
    PRINT Y
    Y = Y + 1
  END
  X = X + 1
END
`);

    expect(analysis.timeComplexity).toBe("O(n^2)");
    expect(analysis.loopCount).toBe(2);
    expect(analysis.maxNestedLoops).toBe(2);
    expect(analysis.score).toBeLessThan(85);
  });

  it("detects multiplicative loop updates as logarithmic", () => {
    const analysis = analyzeMiniScriptComplexity(`
X = 1
WHILE X < N
  X = X * 2
END
`);

    expect(analysis.timeComplexity).toBe("O(log n)");
    expect(analysis.loopCount).toBe(1);
  });

  it("returns localized parser warnings", () => {
    const analysis = analyzeMiniScriptComplexity(
      `
WHILE X < N
  PRINT X
`,
      "ro"
    );

    expect(analysis.warnings).toEqual([
      "Linia 2: bucla fara END corespunzator.",
    ]);
    expect(analysis.timeComplexity).toBe("O(n)");
  });
});
