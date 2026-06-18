import { describe, expect, it } from "vitest";

import { extractMentionUsernames } from "@/lib/mentions";

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
