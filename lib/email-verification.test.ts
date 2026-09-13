import { describe, expect, it } from "vitest";

import {
  isEmailNotConfirmedError,
  isEmailVerified,
} from "@/lib/email-verification";

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

describe("isEmailNotConfirmedError", () => {
  it("recognizes the sign-in rejection for an unconfirmed address", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed" })).toBe(
      true
    );
    expect(
      isEmailNotConfirmedError({ message: "Email not confirmed" })
    ).toBe(true);
  });

  it("leaves other sign-in failures alone", () => {
    expect(isEmailNotConfirmedError(null)).toBe(false);
    expect(
      isEmailNotConfirmedError({ message: "Invalid login credentials" })
    ).toBe(false);
  });
});
