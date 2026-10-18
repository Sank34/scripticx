import type { AppNotification, LiveRoom, RoomParticipant } from "./api";

type InvitationClient = {
  getRoom: (roomId: string) => Promise<LiveRoom | null>;
  getParticipant: (roomId: string, userId: string) => Promise<RoomParticipant | null>;
  acceptInvite: (roomId: string, userId: string) => Promise<void>;
  declineInvite: (roomId: string, userId: string) => Promise<void>;
};

export function getLiveInvitationRoomId(notification: Pick<AppNotification, "type" | "metadata" | "href">) {
  if (notification.type !== "live_invite") return null;
  const metadataId = notification.metadata?.roomId;
  if (typeof metadataId === "string" && metadataId.trim()) return metadataId.trim();
  const href = notification.href;
  if (!href?.startsWith("/") || href.startsWith("//")) return null;
  try {
    const url = new URL(href, "https://scripticx.invalid");
    if (url.origin !== "https://scripticx.invalid") return null;
    if (url.pathname === "/editor") return url.searchParams.get("live")?.trim() || null;
    const legacy = url.pathname.match(/^\/(?:editor\/live|live)\/([^/]+)\/?$/);
    return legacy ? decodeURIComponent(legacy[1]).trim() || null : null;
  } catch {
    return null;
  }
}

export async function loadLiveInvitation(client: InvitationClient, roomId: string, userId: string) {
  const [room, participant] = await Promise.all([
    client.getRoom(roomId), client.getParticipant(roomId, userId),
  ]);
  const status = !room || room.status === "closed"
    ? "unavailable"
    : room.owner_id === userId || participant?.status === "accepted"
      ? "accepted"
      : participant?.status === "invited" ? "pending" : "unavailable";
  return { room, status };
}

export async function respondToLiveInvitation(client: InvitationClient, roomId: string, userId: string, decision: "accept" | "decline") {
  const invitation = await loadLiveInvitation(client, roomId, userId);
  if (invitation.status === "accepted") return "accepted";
  if (invitation.status !== "pending") throw new Error("This invitation is no longer available.");
  if (decision === "accept") await client.acceptInvite(roomId, userId);
  else await client.declineInvite(roomId, userId);
  const participant = await client.getParticipant(roomId, userId);
  if (participant?.status === "accepted") return "accepted";
  if (decision === "decline" && !participant) return "declined";
  throw new Error("The invitation could not be updated. Please try again.");
}
