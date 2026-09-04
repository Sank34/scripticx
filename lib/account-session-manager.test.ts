import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSession: vi.fn(),
  listSavedAccounts: vi.fn(),
  removeSavedAccount: vi.fn(),
  saveAccountSession: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/account-switcher", () => ({
  listSavedAccounts: mocks.listSavedAccounts,
  removeSavedAccount: mocks.removeSavedAccount,
  saveAccountSession: mocks.saveAccountSession,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      setSession: mocks.setSession,
      signOut: mocks.signOut,
    },
  },
}));

import {
  logoutCurrentAccount,
  logoutSavedAccount,
} from "@/lib/account-session-manager";

function session(userId: string): Session {
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
      email: `${userId}@example.com`,
      user_metadata: {},
    },
  };
}

function savedAccount(userId: string) {
  return {
    accessToken: `access-${userId}`,
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    email: `${userId}@example.com`,
    expiresAt: 1_900_000_000,
    nickname: userId,
    refreshToken: `refresh-${userId}`,
    updatedAt: "2026-01-01T00:00:00.000Z",
    userId,
    username: userId,
  };
}

describe("multi-account logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates a validated fallback without emitting a global sign-out", async () => {
    const current = session("current");
    const fallback = session("fallback");
    const validationClient = {
      auth: { setSession: vi.fn().mockResolvedValue({ data: { session: fallback }, error: null }) },
    };
    const revokeClient = {
      auth: {
        setSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    mocks.getSession.mockResolvedValue({ data: { session: current }, error: null });
    mocks.listSavedAccounts.mockReturnValue([
      savedAccount("current"),
      savedAccount("fallback"),
    ]);
    mocks.createClient
      .mockReturnValueOnce(validationClient)
      .mockReturnValueOnce(revokeClient);
    mocks.setSession.mockResolvedValue({ data: { session: fallback }, error: null });

    const result = await logoutCurrentAccount("current");

    expect(result?.session.user.id).toBe("fallback");
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "access-fallback",
      refresh_token: "refresh-fallback",
    });
    expect(mocks.removeSavedAccount).toHaveBeenCalledWith("current");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("keeps the current account active when the fallback is invalid", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: session("current") },
      error: null,
    });
    mocks.listSavedAccounts.mockReturnValue([
      savedAccount("current"),
      savedAccount("fallback"),
    ]);
    mocks.createClient.mockReturnValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error("Invalid refresh token"),
        }),
      },
    });

    await expect(logoutCurrentAccount("current")).rejects.toThrow(
      "Invalid refresh token"
    );
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.removeSavedAccount).not.toHaveBeenCalled();
  });

  it("signs out locally only when there is no fallback account", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: session("current") },
      error: null,
    });
    mocks.listSavedAccounts.mockReturnValue([savedAccount("current")]);
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(logoutCurrentAccount("current")).resolves.toBeNull();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.removeSavedAccount).toHaveBeenCalledWith("current");
  });

  it("removes a saved account locally even when its session has expired", async () => {
    mocks.createClient.mockReturnValue({
      auth: {
        setSession: vi.fn().mockRejectedValue(new Error("Network unavailable")),
      },
    });

    await expect(
      logoutSavedAccount(savedAccount("saved"))
    ).resolves.toBeUndefined();
    expect(mocks.removeSavedAccount).toHaveBeenCalledWith("saved");
  });
});
