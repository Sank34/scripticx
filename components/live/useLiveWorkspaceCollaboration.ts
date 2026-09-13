"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, type LiveRoom } from "@/lib/api";
import {
  getLiveWorkspaceFingerprint,
  getLiveWorkspaceUrl,
  parseLiveWorkspace,
  serializeLiveWorkspace,
  type LiveWorkspaceDocument,
} from "@/lib/editor-live-workspace";
import { supabase } from "@/lib/supabase";

type LiveWorkspaceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

type UseLiveWorkspaceCollaborationInput = {
  roomId: string | null;
  userId: string | null | undefined;
  document: LiveWorkspaceDocument;
  onRemoteWorkspace: (
    document: LiveWorkspaceDocument,
    source: "initial" | "remote"
  ) => void;
};

type WorkspaceBroadcastPayload = {
  userId?: string;
  workspace?: string;
  code?: string;
};

export function useLiveWorkspaceCollaboration({
  roomId,
  userId,
  document,
  onRemoteWorkspace,
}: UseLiveWorkspaceCollaborationInput) {
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [status, setStatus] = useState<LiveWorkspaceStatus>("idle");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteFingerprintRef = useRef<string | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRoomRef = useRef<LiveRoom | null>(null);
  const documentFingerprint = useMemo(
    () => getLiveWorkspaceFingerprint(document),
    [document]
  );

  const persistWorkspace = useCallback(
    (workspace: string) => {
      if (!roomId || currentRoomRef.current?.owner_id !== userId) return;
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        void api.live.saveCode(roomId, workspace).catch((saveError) => {
          console.warn("Could not persist the live workspace:", saveError);
        });
      }, 800);
    },
    [roomId, userId]
  );

  useEffect(() => {
    if (!roomId || !userId) {
      currentRoomRef.current = null;
      setRoom(null);
      setParticipantIds([]);
      setStatus("idle");
      setError(null);
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function connect() {
      setStatus("connecting");
      setError(null);

      try {
        const roomData = await api.live.getRoom(roomId!);
        if (!active) return;
        if (!roomData) throw new Error("Live session not found");

        if (roomData.owner_id !== userId) {
          const membership = await api.live.getParticipant(roomId!, userId!);
          if (membership?.status === "invited") {
            await api.live.acceptInvite(roomId!, userId!);
          } else if (membership?.status !== "accepted") {
            await api.live.joinRoom(roomId!, userId!);
          }
        }

        if (!active) return;

        const initialWorkspace = parseLiveWorkspace(roomData.code);
        remoteFingerprintRef.current = getLiveWorkspaceFingerprint(initialWorkspace);
        onRemoteWorkspace(initialWorkspace, "initial");
        currentRoomRef.current = roomData;
        setRoom(roomData);
        setStatus(roomData.status === "closed" ? "closed" : "connected");

        channel = supabase.channel(`room-${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: userId! },
          },
        });
        channelRef.current = channel;

        const applyIncomingWorkspace = (payload: WorkspaceBroadcastPayload) => {
          if (!active || payload.userId === userId) return;
          const serialized = payload.workspace ?? payload.code;
          if (typeof serialized !== "string") return;

          const nextWorkspace = parseLiveWorkspace(serialized);
          remoteFingerprintRef.current = getLiveWorkspaceFingerprint(nextWorkspace);
          onRemoteWorkspace(nextWorkspace, "remote");
          persistWorkspace(serializeLiveWorkspace(nextWorkspace));
        };

        channel
          .on("broadcast", { event: "workspace-update" }, ({ payload }) => {
            applyIncomingWorkspace(payload as WorkspaceBroadcastPayload);
          })
          .on("broadcast", { event: "code-update" }, ({ payload }) => {
            applyIncomingWorkspace(payload as WorkspaceBroadcastPayload);
          })
          .on("broadcast", { event: "participant-removed" }, ({ payload }) => {
            if ((payload as { userId?: string })?.userId === userId) {
              setError("You no longer have access to this live session.");
              setStatus("error");
            }
          })
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "live_rooms",
              filter: `id=eq.${roomId}`,
            },
            ({ new: nextRoom }) => {
              const updatedRoom = nextRoom as LiveRoom;
              currentRoomRef.current = updatedRoom;
              setRoom(updatedRoom);
              setStatus(updatedRoom.status === "closed" ? "closed" : "connected");
            }
          )
          .on("presence", { event: "sync" }, () => {
            if (!channel) return;
            const ids = Object.keys(channel.presenceState());
            setParticipantIds(ids.length ? ids : [userId!]);
          })
          .subscribe(async (nextStatus) => {
            if (!active) return;
            if (nextStatus === "SUBSCRIBED") {
              const profile = await api.profiles.getSummary(userId!);
              if (!active || !channel) return;
              await channel.track({
                user_id: userId,
                username: profile?.username || "User",
                avatar_url: profile?.avatar_url || null,
                online_at: new Date().toISOString(),
              });
            }
            if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
              setError("Realtime connection failed. Retrying may be required.");
              setStatus("error");
            }
          });
      } catch (connectError) {
        if (!active) return;
        console.error("Could not open the live workspace:", connectError);
        setError(
          connectError instanceof Error
            ? connectError.message
            : "Could not open the live workspace"
        );
        setStatus("error");
      }
    }

    void connect();

    return () => {
      active = false;
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      if (channelRef.current === channel) channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [onRemoteWorkspace, persistWorkspace, roomId, userId]);

  useEffect(() => {
    if (!roomId || status !== "connected" || !channelRef.current) return;

    if (remoteFingerprintRef.current === documentFingerprint) {
      remoteFingerprintRef.current = null;
      return;
    }

    if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
    broadcastTimeoutRef.current = setTimeout(() => {
      const workspace = serializeLiveWorkspace(document);
      void channelRef.current?.send({
        type: "broadcast",
        event: "workspace-update",
        payload: { workspace, userId },
      });
      persistWorkspace(workspace);
    }, 120);

    return () => {
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
    };
  }, [document, documentFingerprint, persistWorkspace, roomId, status, userId]);

  const copyInviteLink = useCallback(async () => {
    if (!roomId) return false;
    await navigator.clipboard.writeText(
      getLiveWorkspaceUrl(roomId, window.location.origin)
    );
    return true;
  }, [roomId]);

  const closeSession = useCallback(async () => {
    if (!roomId || currentRoomRef.current?.owner_id !== userId) return false;
    await api.live.closeRoom(roomId);
    currentRoomRef.current = currentRoomRef.current
      ? { ...currentRoomRef.current, status: "closed" }
      : null;
    setRoom(currentRoomRef.current);
    setStatus("closed");
    return true;
  }, [roomId, userId]);

  return {
    room,
    status,
    error,
    participantCount: Math.max(participantIds.length, room ? 1 : 0),
    isOwner: Boolean(room && room.owner_id === userId),
    copyInviteLink,
    closeSession,
  };
}
