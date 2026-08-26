import { describe, expect, it } from "vitest";

import {
  MAX_PROFILE_PRONOUNS_LENGTH,
  normalizeProfilePronouns,
} from "./profile-pronouns";

describe("normalizeProfilePronouns", () => {
  it("keeps an ordinary pronoun value", () => {
    expect(normalizeProfilePronouns("they/them")).toBe("they/them");
  });

  it("turns blank values into null so they stay hidden", () => {
    expect(normalizeProfilePronouns("   ")).toBeNull();
    expect(normalizeProfilePronouns(null)).toBeNull();
  });

  it("removes surrounding and repeated whitespace", () => {
    expect(normalizeProfilePronouns("  she /   her\n ")).toBe("she / her");
  });

  it("limits the stored value", () => {
    expect(normalizeProfilePronouns("x".repeat(80))).toHaveLength(
      MAX_PROFILE_PRONOUNS_LENGTH
    );
  });
});
