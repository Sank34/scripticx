import { describe, expect, it } from "vitest";

import { isEmailVerificationCallback } from "@/lib/auth-callback";

describe("isEmailVerificationCallback", () => {
  it("recognizes the explicit ScripticX verification flow", () => {
    expect(
      isEmailVerificationCallback("?flow=verification&next=/dashboard", "")
    ).toBe(true);
  });

  it("recognizes Supabase signup callbacks in query strings and hashes", () => {
    expect(isEmailVerificationCallback("?type=signup", "")).toBe(true);
    expect(
      isEmailVerificationCallback("", "#access_token=token&type=signup")
    ).toBe(true);
  });

  it("does not treat OAuth and recovery callbacks as account verification", () => {
    expect(isEmailVerificationCallback("?code=oauth-code", "")).toBe(false);
    expect(isEmailVerificationCallback("", "#type=recovery")).toBe(false);
  });
});
