import { describe, expect, it, vi } from "vitest";
import { getLiveInvitationRoomId, loadLiveInvitation, respondToLiveInvitation } from "./live-invitations";
import type { LiveRoom, RoomParticipant } from "./api";

function fixture(status: string | null = "invited", room: LiveRoom | null = { id: "room", owner_id: "owner", status: "active" }) {
  let participant = status ? { id: "membership", user_id: "guest", room_id: "room", status } as RoomParticipant : null;
  return {
    getRoom: vi.fn(async () => room),
    getParticipant: vi.fn(async () => participant),
    acceptInvite: vi.fn(async () => { if (participant) participant = { ...participant, status: "accepted" }; }),
    declineInvite: vi.fn(async () => { participant = null; }),
  };
}

describe("Live Share invitation decisions", () => {
  it("loading an invitation never accepts it or grants membership", async () => {
    const client = fixture();
    expect((await loadLiveInvitation(client, "room", "guest")).status).toBe("pending");
    expect(client.acceptInvite).not.toHaveBeenCalled();
    expect(client.declineInvite).not.toHaveBeenCalled();
  });

  it("accepts explicitly and verifies membership before allowing navigation", async () => {
    const client = fixture();
    await expect(respondToLiveInvitation(client, "room", "guest", "accept")).resolves.toBe("accepted");
    expect(client.acceptInvite).toHaveBeenCalledExactlyOnceWith("room", "guest");
    expect(client.getParticipant).toHaveBeenCalledTimes(2);
    expect(client.declineInvite).not.toHaveBeenCalled();
  });

  it("declines without accepting and leaves an old notification unavailable", async () => {
    const client = fixture();
    await expect(respondToLiveInvitation(client, "room", "guest", "decline")).resolves.toBe("declined");
    expect(client.acceptInvite).not.toHaveBeenCalled();
    await expect(respondToLiveInvitation(client, "room", "guest", "accept")).rejects.toThrow("no longer available");
    expect(client.acceptInvite).not.toHaveBeenCalled();
  });

  it("does not remove an already accepted membership through an old invitation", async () => {
    const client = fixture("accepted");
    await expect(respondToLiveInvitation(client, "room", "guest", "decline")).resolves.toBe("accepted");
    expect(client.declineInvite).not.toHaveBeenCalled();
    expect(client.acceptInvite).not.toHaveBeenCalled();
  });

  it("does not enter missing, closed or withdrawn sessions", async () => {
    for (const client of [fixture(null), fixture("invited", null), fixture("invited", { id: "room", owner_id: "owner", status: "closed" })]) {
      await expect(respondToLiveInvitation(client, "room", "guest", "accept")).rejects.toThrow();
      expect(client.acceptInvite).not.toHaveBeenCalled();
    }
  });

  it("blocks navigation when the acceptance write did not update membership", async () => {
    const client = fixture();
    client.acceptInvite.mockImplementation(async () => undefined);
    await expect(respondToLiveInvitation(client, "room", "guest", "accept")).rejects.toThrow("could not be updated");
  });

  it("propagates write failures so the dialog can stay open for retry", async () => {
    const client = fixture();
    client.declineInvite.mockRejectedValue(new Error("Offline"));
    await expect(respondToLiveInvitation(client, "room", "guest", "decline")).rejects.toThrow("Offline");
    expect((await loadLiveInvitation(client, "room", "guest")).status).toBe("pending");
  });
});

describe("notification invitation links", () => {
  it("resolves metadata and both current and legacy session links", () => {
    for (const notification of [
      { metadata: { roomId: "room" }, href: null },
      { metadata: {}, href: "/editor?live=room&view=live" },
      { metadata: {}, href: "/editor/live/room" },
      { metadata: {}, href: "/live/room" },
    ]) expect(getLiveInvitationRoomId({ type: "live_invite", ...notification })).toBe("room");
  });

  it("does not interpret unrelated notifications or unsafe links as invitations", () => {
    expect(getLiveInvitationRoomId({ type: "follow", metadata: { roomId: "room" }, href: null })).toBeNull();
    for (const href of ["https://evil.test/editor?live=room", "//evil.test/editor?live=room", "/dashboard?live=room", "/editor", "/live/%broken"]) {
      expect(getLiveInvitationRoomId({ type: "live_invite", metadata: {}, href })).toBeNull();
    }
  });
});
