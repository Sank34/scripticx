import { describe, expect, it } from "vitest";

import { matchesProblemSearch } from "./problem-search";

const problem = { code: 318, title: "Suffixes", description: "String practice" };

describe("matchesProblemSearch", () => {
  it("matches a problem code with or without the hash prefix", () => {
    expect(matchesProblemSearch(problem, "#318")).toBe(true);
    expect(matchesProblemSearch(problem, "318")).toBe(true);
    expect(matchesProblemSearch(problem, "# 318")).toBe(true);
  });

  it("keeps title and description search working", () => {
    expect(matchesProblemSearch(problem, "suffix")).toBe(true);
    expect(matchesProblemSearch(problem, "practice")).toBe(true);
    expect(matchesProblemSearch(problem, "#319")).toBe(false);
  });
});
