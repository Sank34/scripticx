import type { LiveRoom, RoomParticipant } from "./api";

type MembershipClient = {
  getParticipant: (roomId: string, userId: string) => Promise<RoomParticipant | null>;
  acceptInvite: (roomId: string, userId: string) => Promise<void>;
  joinRoom: (roomId: string, userId: string) => Promise<void>;
};

export async function ensureLiveMembership(client: MembershipClient, room: LiveRoom, userId: string) {
  if (room.owner_id === userId) return;
  const participant = await client.getParticipant(room.id, userId);
  if (participant?.status === "removed") throw new Error("You were removed from this live session. Ask its owner for a new invitation.");
  if (participant?.status === "accepted") return;
  if (participant?.status === "invited") await client.acceptInvite(room.id, userId);
  else if (!participant) await client.joinRoom(room.id, userId);
  else throw new Error("You do not have access to this live session.");
  const current = await client.getParticipant(room.id, userId);
  if (current?.status !== "accepted") throw new Error("You do not have access to this live session.");
}
