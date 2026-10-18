import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), delete: vi.fn(), single: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: db }));
import { api } from "./api";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.spyOn(api.live, "getRoom").mockResolvedValue({ id: "room", owner_id: "owner", status: "active" });
  db.auth.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  for (const fn of [db.from, db.select, db.eq, db.upsert, db.delete]) fn.mockReturnValue(db);
  db.maybeSingle.mockResolvedValue({ data: { user_id: "guest" }, error: null });
});

describe("live member removal", () => {
  it("records removal even for a legacy presence-only member before cleaning up presence", async () => {
    await api.live.removeRoomParticipant("room", "guest");
    expect(db.upsert).toHaveBeenCalledExactlyOnceWith({ room_id: "room", user_id: "guest", status: "removed" }, { onConflict: "room_id,user_id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.upsert.mock.invocationCallOrder[0]).toBeLessThan(db.delete.mock.invocationCallOrder[0]);
  });

  it("rejects a non-owner and prevents removing the owner", async () => {
    db.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "guest" } }, error: null });
    await expect(api.live.removeRoomParticipant("room", "other")).rejects.toThrow("Only the session owner");
    await expect(api.live.removeRoomParticipant("room", "owner")).rejects.toThrow("cannot be removed");
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("does not report success when RLS or persistence prevents the removal", async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(api.live.removeRoomParticipant("room", "guest")).rejects.toThrow("could not be removed");
    expect(db.delete).not.toHaveBeenCalled();
  });
});
