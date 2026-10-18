import { describe, expect, it, vi } from "vitest";
import { ensureLiveMembership } from "./live-membership";

const room = { id: "room", owner_id: "owner", status: "active" };
function client(status: string | null) {
  return {
    getParticipant: vi.fn(async () => status ? { user_id: "guest", status } : null),
    acceptInvite: vi.fn(async () => { status = "accepted"; }),
    joinRoom: vi.fn(async () => { status = "accepted"; }),
  };
}

describe("live session membership", () => {
  it("blocks removed members from rejoining with their old link", async () => {
    const api = client("removed");
    await expect(ensureLiveMembership(api, room, "guest")).rejects.toThrow("new invitation");
    expect(api.joinRoom).not.toHaveBeenCalled();
    expect(api.acceptInvite).not.toHaveBeenCalled();
  });

  it("lets an owner back in without creating a participant membership", async () => {
    const api = client(null);
    await ensureLiveMembership(api, room, "owner");
    expect(api.getParticipant).not.toHaveBeenCalled();
    expect(api.joinRoom).not.toHaveBeenCalled();
  });

  it("allows an explicitly renewed invitation after removal", async () => {
    const api = client("invited");
    await ensureLiveMembership(api, room, "guest");
    expect(api.acceptInvite).toHaveBeenCalledExactlyOnceWith("room", "guest");
    expect(api.joinRoom).not.toHaveBeenCalled();
  });

  it("preserves accepted members and ordinary shared-link joins", async () => {
    const accepted = client("accepted");
    await ensureLiveMembership(accepted, room, "guest");
    expect(accepted.joinRoom).not.toHaveBeenCalled();
    const newcomer = client(null);
    await ensureLiveMembership(newcomer, room, "guest");
    expect(newcomer.joinRoom).toHaveBeenCalledExactlyOnceWith("room", "guest");
  });

  it("does not enter if membership was revoked while joining", async () => {
    const api = client(null);
    api.getParticipant.mockResolvedValueOnce(null).mockResolvedValueOnce({ user_id: "guest", status: "removed" });
    await expect(ensureLiveMembership(api, room, "guest")).rejects.toThrow("do not have access");
  });
});
