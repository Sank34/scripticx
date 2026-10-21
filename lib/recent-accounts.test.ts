import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetRecentAccount, listRecentAccounts, MAX_RECENT_ACCOUNTS, mergeRecentAccount, parseRecentAccounts, RECENT_ACCOUNTS_STORAGE_KEY, rememberRecentAccount, seedRecentAccounts, type RecentAccount } from "./recent-accounts";
import { listSavedAccounts, removeSavedAccount, saveAccountSession } from "./account-switcher";

function account(id = "one", lastUsedAt = "2026-10-21T12:00:00Z"): RecentAccount {
  return { userId: id, email: `${id}@example.com`, nickname: id, username: id, avatarUrl: null, lastUsedAt };
}

function session(id = "one"): Session {
  return {
    access_token: "private-access", refresh_token: "private-refresh", token_type: "bearer", expires_in: 3600,
    user: { id, email: `${id}@example.com`, aud: "authenticated", created_at: "2026-10-21T00:00:00Z", app_metadata: {}, user_metadata: {} },
  };
}

let storage: Map<string, string>;
let browser: { localStorage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> }; dispatchEvent: ReturnType<typeof vi.fn> };
beforeEach(() => {
  storage = new Map();
  browser = {
    localStorage: { getItem: vi.fn((key: string) => storage.get(key) ?? null), setItem: vi.fn((key: string, value: string) => storage.set(key, value)) },
    dispatchEvent: vi.fn(),
  };
  vi.stubGlobal("window", browser);
});
afterEach(() => vi.unstubAllGlobals());

describe("recent identities", () => {
  it("strips credentials and any unexpected fields from imported records", () => {
    const parsed = parseRecentAccounts(JSON.stringify([{ ...account(), accessToken: "secret", refreshToken: "secret", password: "secret", metadata: { token: "secret" } }]));
    expect(parsed).toEqual([{ ...account(), lastUsedAt: "2026-10-21T12:00:00.000Z" }]);
    expect(JSON.stringify(parsed)).not.toContain("secret");
  });

  it("rejects malformed storage, invalid dates and incomplete identities", () => {
    for (const raw of [null, "broken", "{}", JSON.stringify([{ email: "missing@example.com" }, { ...account(), lastUsedAt: "bad" }, { ...account(), email: "not-an-email" }])]) {
      expect(parseRecentAccounts(raw)).toEqual([]);
    }
  });

  it("keeps only the latest identity per user and per email, ordered by actual use", () => {
    const records = [account("old", "2026-01-01"), account("two"), { ...account("new", "2026-10-22"), email: " TWO@example.com " }, account("old", "2026-10-23")];
    expect(parseRecentAccounts(JSON.stringify(records)).map(item => item.userId)).toEqual(["old", "new"]);
  });

  it("bounds the list and updates an existing account instead of duplicating it", () => {
    let records: RecentAccount[] = [];
    for (let index = 1; index <= 9; index++) records = mergeRecentAccount(records, account(String(index), `2026-10-${String(index).padStart(2, "0")}`));
    expect(records).toHaveLength(MAX_RECENT_ACCOUNTS);
    expect(records[0].userId).toBe("9");
    records = mergeRecentAccount(records, { ...account("9", "2026-10-10"), nickname: "Updated" });
    expect(records).toHaveLength(MAX_RECENT_ACCOUNTS);
    expect(records[0].nickname).toBe("Updated");
  });

  it("keeps an identity after logout removes the saved token pair", () => {
    saveAccountSession(session(), { username: "coder", nickname: "School" });
    expect(listSavedAccounts()).toHaveLength(1);
    removeSavedAccount("one");
    expect(listSavedAccounts()).toEqual([]);
    expect(listRecentAccounts()[0]).toMatchObject({ userId: "one", email: "one@example.com", nickname: "School", username: "coder" });
    expect(storage.get(RECENT_ACCOUNTS_STORAGE_KEY)).not.toMatch(/private-access|private-refresh|accessToken|refreshToken/);
  });

  it("migrates old saved accounts without copying credentials or inventing a new last-used date", () => {
    seedRecentAccounts([{ ...account(), updatedAt: "2026-05-01T12:00:00Z", accessToken: "private-access" } as Parameters<typeof seedRecentAccounts>[0][number]]);
    expect(listRecentAccounts()[0].lastUsedAt).toBe("2026-05-01T12:00:00.000Z");
    expect(storage.get(RECENT_ACCOUNTS_STORAGE_KEY)).not.toContain("private-access");
  });

  it("removes a forgotten identity without clearing other accounts", () => {
    rememberRecentAccount(account());
    rememberRecentAccount(account("two"));
    forgetRecentAccount("one");
    expect(listRecentAccounts().map(item => item.userId)).toEqual(["two"]);
  });

  it("does not break authentication when the browser denies storage or runs out of space", () => {
    browser.localStorage.setItem.mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => saveAccountSession(session())).not.toThrow();
    browser.localStorage.getItem.mockImplementation(() => { throw new Error("Storage denied"); });
    expect(() => rememberRecentAccount(account())).not.toThrow();
    expect(listRecentAccounts()).toEqual([]);
    expect(listSavedAccounts()).toEqual([]);
    Object.defineProperty(browser, "localStorage", { get() { throw new Error("SecurityError"); } });
    expect(() => saveAccountSession(session())).not.toThrow();
    expect(listRecentAccounts()).toEqual([]);
  });
});
