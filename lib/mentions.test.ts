import { describe, expect, it } from "vitest";

import {
  clampMentionSelection,
  extractMentionUsernames,
  moveMentionSelection,
} from "@/lib/mentions";

describe("extractMentionUsernames", () => {
  it("extracts unique usernames from post text", () => {
    expect(
      extractMentionUsernames("Hello @andrei and @user_2. Thanks, @andrei!")
    ).toEqual(["andrei", "user_2"]);
  });

  it("normalizes usernames for database lookup", () => {
    expect(extractMentionUsernames("@ScripticX-Fan")).toEqual([
      "scripticx-fan",
    ]);
  });

  it("does not interpret email addresses as mentions", () => {
    expect(extractMentionUsernames("Contact hello@example.com")).toEqual([]);
  });
});

describe("moveMentionSelection", () => {
  it("walks the suggestion list in both directions", () => {
    expect(moveMentionSelection(0, 1, 4)).toBe(1);
    expect(moveMentionSelection(2, -1, 4)).toBe(1);
  });

  it("wraps around at both ends", () => {
    expect(moveMentionSelection(3, 1, 4)).toBe(0);
    expect(moveMentionSelection(0, -1, 4)).toBe(3);
  });

  it("stays on the first row when there is nothing to suggest", () => {
    expect(moveMentionSelection(0, 1, 0)).toBe(0);
  });
});

describe("clampMentionSelection", () => {
  it("keeps a highlight that is still in range", () => {
    expect(clampMentionSelection(2, 5)).toBe(2);
  });

  it("pulls the highlight back when the suggestions shrink", () => {
    expect(clampMentionSelection(8, 3)).toBe(2);
    expect(clampMentionSelection(8, 0)).toBe(0);
  });
});
