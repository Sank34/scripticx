import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";

import {
  mergeSavedAccount,
  parseSavedAccounts,
  removeSavedAccountFromList,
} from "@/lib/account-switcher";

function session(userId: string, email: string): Session {
  return {
    access_token: `access-${userId}`,
    expires_at: 1_900_000_000,
    expires_in: 3600,
    refresh_token: `refresh-${userId}`,
    token_type: "bearer",
    user: {
      id: userId,
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
      email,
      user_metadata: {},
    },
  };
}

describe("account switcher registry", () => {
  it("keeps one record per user and preserves a custom nickname on refresh", () => {
    const first = mergeSavedAccount([], session("one", "one@example.com"), {
      nickname: "School",
      username: "andrei",
    });
    const refreshed = mergeSavedAccount(first, session("one", "one@example.com"));

    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]).toMatchObject({
      nickname: "School",
      username: "andrei",
      userId: "one",
    });
  });

  it("rejects malformed and duplicate storage entries", () => {
    const accounts = mergeSavedAccount([], session("one", "one@example.com"));
    const parsed = parseSavedAccounts(
      JSON.stringify([...accounts, accounts[0], { email: "broken" }])
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0].userId).toBe("one");
  });

  it("removes only the selected account", () => {
    const accounts = mergeSavedAccount(
      mergeSavedAccount([], session("one", "one@example.com")),
      session("two", "two@example.com")
    );

    expect(removeSavedAccountFromList(accounts, "two").map((item) => item.userId)).toEqual([
      "one",
    ]);
  });
});

