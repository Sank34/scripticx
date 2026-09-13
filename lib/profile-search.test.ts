import { describe, expect, it } from "vitest";

import {
  buildUsernameSearchPattern,
  normalizeUsernameSearch,
} from "@/lib/profile-search";

describe("normalizeUsernameSearch", () => {
  it("keeps the characters usernames are made of", () => {
    expect(normalizeUsernameSearch("  ScripticX_Fan-2 ")).toBe("ScripticX_Fan-2");
  });

  it("drops characters that can never appear in a username", () => {
    expect(normalizeUsernameSearch("andrei');")).toBe("andrei");
    expect(normalizeUsernameSearch("(a,b).c:d")).toBe("abcd");
  });

  it("caps the term so a long paste cannot become a heavy scan", () => {
    expect(normalizeUsernameSearch("a".repeat(500))).toHaveLength(64);
  });
});

describe("buildUsernameSearchPattern", () => {
  it("wraps the term in a contains pattern", () => {
    expect(buildUsernameSearchPattern("andrei")).toBe("%andrei%");
  });

  it("escapes underscores so they match literally instead of any character", () => {
    expect(buildUsernameSearchPattern("user_2")).toBe("%user\\_2%");
  });

  it("does not let wildcards through as a match-everything query", () => {
    expect(buildUsernameSearchPattern("%")).toBeNull();
    expect(buildUsernameSearchPattern("*")).toBeNull();
    expect(buildUsernameSearchPattern("%a%")).toBe("%a%");
  });

  it("returns nothing to search for when the term has no usable characters", () => {
    expect(buildUsernameSearchPattern("   ")).toBeNull();
    expect(buildUsernameSearchPattern("!!!")).toBeNull();
  });
});
