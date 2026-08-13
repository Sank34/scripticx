import { describe, expect, it } from "vitest";

import { isEmailVerified } from "@/lib/email-verification";

describe("isEmailVerified", () => {
  it("treats missing confirmation timestamps as unverified", () => {
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified({})).toBe(false);
    expect(isEmailVerified({ email_confirmed_at: null })).toBe(false);
  });

  it("recognizes a confirmed email", () => {
    expect(
      isEmailVerified({ email_confirmed_at: "2026-08-11T16:00:00.000Z" })
    ).toBe(true);
  });
});
