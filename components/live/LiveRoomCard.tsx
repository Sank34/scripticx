"use client";

import type { LiveRoom, ProfileSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/UserAvatar";

type LiveRoomCardProps = {
  memberLabel: string;
  onOpen: () => void;
  ownerLabel: string;
  participants?: ProfileSummary[];
  fallbackName: string;
  room: LiveRoom;
  statusLabel: string;
  statusTone?: "active" | "muted";
  userId: string | null;
};

export function LiveRoomCard({
  memberLabel,
  onOpen,
  ownerLabel,
  participants = [],
  fallbackName,
  room,
  statusLabel,
  statusTone = "muted",
  userId,
}: LiveRoomCardProps) {
  const visibleParticipants = participants.filter(Boolean).slice(0, 3);
  const extraParticipants = Math.max(0, participants.filter(Boolean).length - 3);
  const isOwner = room.owner_id === userId;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer hover:scale-[1.01] transition"
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{room.name || fallbackName}</p>
          <p className="text-xs text-muted-foreground">
            {room.created_at ? new Date(room.created_at).toLocaleString() : ""}
          </p>
        </div>

        {participants.length > 0 && (
          <div className="hidden shrink-0 items-center -space-x-2 sm:flex">
            {visibleParticipants.map((participant, index) => (
              <UserAvatar
                key={participant.id || participant.username || index}
                avatarUrl={participant.avatar_url}
                className="w-6 h-6 border"
                username={participant.username}
              />
            ))}

            {extraParticipants > 0 && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border">
                +{extraParticipants}
              </div>
            )}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded px-2 py-[2px] text-[10px] ${
              isOwner
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isOwner ? ownerLabel : memberLabel}
          </span>
          <span
            className={`text-sm ${
              statusTone === "active" ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
