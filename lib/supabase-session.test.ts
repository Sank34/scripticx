import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

import {
  clearSupabaseSessionSnapshot,
  getSupabaseSession,
  updateSupabaseSessionSnapshot,
} from "@/lib/supabase-session";

describe("shared Supabase session reader", () => {
  beforeEach(() => {
    clearSupabaseSessionSnapshot();
    getSessionMock.mockReset();
  });

  it("deduplicates concurrent session reads", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await Promise.all([
      getSupabaseSession({ fresh: true }),
      getSupabaseSession({ fresh: true }),
      getSupabaseSession({ fresh: true }),
    ]);

    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it("uses an auth event as a short-lived session snapshot", async () => {
    updateSupabaseSessionSnapshot(null);

    await expect(getSupabaseSession()).resolves.toEqual({
      data: { session: null },
      error: null,
    });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("allows recovery after a failed session request", async () => {
    getSessionMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ data: { session: null }, error: null });

    await expect(getSupabaseSession({ fresh: true })).rejects.toThrow(
      "Failed to fetch"
    );
    await expect(getSupabaseSession({ fresh: true })).resolves.toEqual({
      data: { session: null },
      error: null,
    });
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });
});
