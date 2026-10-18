"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, type LiveRoom } from "@/lib/api";
import {
  getLiveWorkspaceFingerprint,
  getLiveWorkspaceUrl,
  isSerializedLiveWorkspace,
  parseLiveWorkspace,
  serializeLiveWorkspace,
  type LiveWorkspaceDocument,
  type LiveProjectOrigin,
} from "@/lib/editor-live-workspace";
import { getLiveEditorPeers, parseLiveEditorSelection, type LiveEditorPeer, type LiveEditorSelection } from "@/lib/live-editor-presence";
import { createLiveUpdateScheduler } from "@/lib/live-update-scheduler";
import { applyLiveFileUpdates, getLiveFileUpdates } from "@/lib/live-workspace-updates";
import { supabase } from "@/lib/supabase";
import { ensureLiveMembership } from "@/lib/live-membership";

type LiveWorkspaceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

type UseLiveWorkspaceCollaborationInput = {
  roomId: string | null;
  userId: string | null | undefined;
  username?: string | null;
  document: LiveWorkspaceDocument;
  onRemoteWorkspace: (
    document: LiveWorkspaceDocument,
    source: "initial" | "remote",
    ownedProject?: { isPublic: boolean }
  ) => void;
  onAccessEnded: () => void;
};

type WorkspaceBroadcastPayload = {
  userId?: string;
  clientId?: string;
  targetClientId?: string;
  workspace?: string;
  code?: string;
};

export function useLiveWorkspaceCollaboration({
  roomId,
  userId,
  username,
  document,
  onRemoteWorkspace,
  onAccessEnded,
}: UseLiveWorkspaceCollaborationInput) {
  const queryClient = useQueryClient();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [status, setStatus] = useState<LiveWorkspaceStatus>("idle");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<LiveEditorPeer[]>([]);
  const [projectOrigin, setProjectOrigin] = useState<LiveProjectOrigin | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteFingerprintRef = useRef<string | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistStartedRef = useRef<number | null>(null);
  const broadcastRef = useRef<ReturnType<typeof createLiveUpdateScheduler> | null>(null);
  const sentDocumentRef = useRef(document);
  const currentRoomRef = useRef<LiveRoom | null>(null);
  const documentRef = useRef(document);
  const usernameRef = useRef(username);
  const originRef = useRef<LiveProjectOrigin | null>(null);
  const presenceRef = useRef<Record<string, unknown>>({});
  const selectionRef = useRef<LiveEditorSelection | null>(null);
  const cursorBroadcastRef = useRef<ReturnType<typeof createLiveUpdateScheduler> | null>(null);
  const pendingPersistRef = useRef<{ roomId: string; workspace: LiveWorkspaceDocument } | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const removedParticipantIdsRef = useRef(new Set<string>());
  const accessEndedRef = useRef(false);
  const sharedDocument = useMemo(() => ({
    ...document,
    project: room?.owner_id === userId ? document.project ?? projectOrigin : projectOrigin,
  }), [document, projectOrigin, room?.owner_id, userId]);
  useEffect(() => { documentRef.current = sharedDocument; }, [sharedDocument]);
  useEffect(() => {
    usernameRef.current = username;
    if (!username || !channelRef.current || !currentRoomRef.current || currentRoomRef.current.status === "closed") return;
    presenceRef.current = { ...presenceRef.current, username };
    void channelRef.current.track({ ...presenceRef.current, selection: selectionRef.current });
  }, [username]);
  const documentFingerprint = useMemo(
    () => getLiveWorkspaceFingerprint(sharedDocument),
    [sharedDocument]
  );

  const enqueueSave = useCallback((pending: { roomId: string; workspace: LiveWorkspaceDocument }) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => api.live.saveCode(pending.roomId, serializeLiveWorkspace(pending.workspace)))
      .catch(saveError => {
        console.warn("Could not persist the live workspace:", saveError);
        setError("Live changes could not be saved. Please retry before leaving the session.");
      });
  }, []);

  const persistWorkspace = useCallback(
    (workspace: LiveWorkspaceDocument) => {
      if (!roomId || currentRoomRef.current?.status !== "active") return;
      pendingPersistRef.current = { roomId, workspace };
      persistStartedRef.current ??= Date.now();
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        persistStartedRef.current = null;
        if (pendingPersistRef.current) enqueueSave(pendingPersistRef.current);
        pendingPersistRef.current = null;
      }, Math.max(0, Math.min(800, 2_000 - (Date.now() - persistStartedRef.current))));
    },
    [enqueueSave, roomId]
  );

  const publishSelection = useCallback((selection: LiveEditorSelection | null) => {
    selectionRef.current = selection;
    cursorBroadcastRef.current?.schedule();
  }, []);

  useEffect(() => {
    if (!roomId || !userId) {
      currentRoomRef.current = null;
      setRoom(null);
      setParticipantIds([]);
      setPeers([]);
      setProjectOrigin(null);
      setStatus("idle");
      setError(null);
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let membershipTimer: ReturnType<typeof setInterval> | null = null;

    function revokeAccess() {
      if (!active) return;
      active = false;
      accessEndedRef.current = true;
      setError("You no longer have access to this live session.");
      setStatus("error");
      setPeers([]);
      setParticipantIds([]);
      onAccessEnded();
      broadcastRef.current?.cancel();
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      pendingPersistRef.current = null;
      cursorBroadcastRef.current?.cancel();
      if (membershipTimer) clearInterval(membershipTimer);
      if (channelRef.current === channel) channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
      void queryClient.invalidateQueries({ queryKey: ["livecode"] });
    }

    async function verifyMembership() {
      if (!active || currentRoomRef.current?.status === "closed" || currentRoomRef.current?.owner_id === userId) return;
      try {
        const participant = await api.live.getParticipant(roomId!, userId!);
        if (active && participant?.status !== "accepted") revokeAccess();
      } catch (membershipError) {
        console.warn("Could not verify Live Share membership:", membershipError);
      }
    }

    async function connect() {
      setStatus("connecting");
      setError(null);
      setPeers([]);
      remoteFingerprintRef.current = null;
      removedParticipantIdsRef.current.clear();
      accessEndedRef.current = false;

      try {
        let roomData = await api.live.getRoom(roomId!);
        if (!active) return;
        if (!roomData) throw new Error("Live session not found");

        if (roomData.status === "closed" && roomData.owner_id !== userId) {
          accessEndedRef.current = true;
          currentRoomRef.current = roomData;
          setRoom(roomData);
          setStatus("closed");
          onAccessEnded();
          return;
        }
        if (roomData.status === "closed" && !roomData.code) {
          currentRoomRef.current = roomData;
          setRoom(roomData);
          setStatus("closed");
          onAccessEnded();
          return;
        }
        await ensureLiveMembership(api.live, roomData, userId!);
        if (roomData.owner_id !== userId && !roomData.code) {
          roomData = await api.live.getRoom(roomId!);
          if (!roomData || roomData.status === "closed") {
            if (active) { setStatus("closed"); onAccessEnded(); }
            return;
          }
        }

        if (!active) return;

        void queryClient.invalidateQueries({ queryKey: ["livecode"] });
        const initialWorkspace = parseLiveWorkspace(roomData.code);
        let ownedProject: { isPublic: boolean } | undefined;
        if (initialWorkspace.project?.ownerId !== roomData.owner_id) initialWorkspace.project = null;
        if (roomData.owner_id === userId && initialWorkspace.project) {
          const { data: owned, error: ownershipError } = await supabase.from("snippets")
            .select("id,is_public").eq("id", initialWorkspace.project.projectId).eq("user_id", userId).maybeSingle();
          if (ownershipError) throw ownershipError;
          if (!owned) initialWorkspace.project = null;
          else ownedProject = { isPublic: owned.is_public !== false };
          if (!active) return;
        }
        originRef.current = initialWorkspace.project;
        documentRef.current = initialWorkspace;
        sentDocumentRef.current = initialWorkspace;
        setProjectOrigin(initialWorkspace.project);
        remoteFingerprintRef.current = getLiveWorkspaceFingerprint(initialWorkspace);
        onRemoteWorkspace(initialWorkspace, "initial", ownedProject);
        currentRoomRef.current = roomData;
        setRoom(roomData);
        if (roomData.status === "closed") { setStatus("closed"); return; }

        channel = supabase.channel(`room-${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: userId! },
          },
        });
        channelRef.current = channel;
        const clientId = crypto.randomUUID();
        let subscribed = false;
        const sendWorkspace = () => {
          if (!active || !subscribed || currentRoomRef.current?.status !== "active") return;
          const next = documentRef.current;
          const files = getLiveFileUpdates(sentDocumentRef.current, next);
          sentDocumentRef.current = next;
          if (files?.length === 0) return;
          void channel?.send({ type: "broadcast", event: files ? "workspace-files" : "workspace-update",
            payload: { userId, clientId, ...(files ? { files } : { workspace: serializeLiveWorkspace(next) }) },
          });
        };
        broadcastRef.current = createLiveUpdateScheduler(sendWorkspace);
        cursorBroadcastRef.current = createLiveUpdateScheduler(() => {
          if (!active || !subscribed || currentRoomRef.current?.status !== "active") return;
          void channel?.send({ type: "broadcast", event: "cursor-update",
            payload: { userId, clientId, selection: selectionRef.current },
          });
        });
        const acceptSender = (payload: WorkspaceBroadcastPayload) => payload && typeof payload.userId === "string" && active && subscribed &&
          currentRoomRef.current?.status === "active" && payload.clientId !== clientId &&
          (!payload.targetClientId || payload.targetClientId === clientId) &&
          (payload.clientId || payload.userId !== userId) &&
          !(payload.userId && removedParticipantIdsRef.current.has(payload.userId));
        const applyWorkspace = (nextWorkspace: LiveWorkspaceDocument) => {
          documentRef.current = nextWorkspace;
          sentDocumentRef.current = nextWorkspace;
          if (pendingPersistRef.current?.roomId === roomId) {
            pendingPersistRef.current.workspace = nextWorkspace;
          }
          remoteFingerprintRef.current = getLiveWorkspaceFingerprint(nextWorkspace);
          onRemoteWorkspace(nextWorkspace, "remote");
        };

        const applyIncomingWorkspace = (payload: WorkspaceBroadcastPayload) => {
          if (!acceptSender(payload)) return;
          const serialized = payload.workspace ?? payload.code;
          if (typeof serialized !== "string") return;
          if (!isSerializedLiveWorkspace(serialized)) {
            const files = documentRef.current.files;
            if (files.length !== 1 || files[0].path !== "main.msp") return;
          }

          let nextWorkspace: LiveWorkspaceDocument;
          try { nextWorkspace = parseLiveWorkspace(serialized); }
          catch { return; }
          nextWorkspace.project = payload.userId === currentRoomRef.current?.owner_id && nextWorkspace.project?.ownerId === payload.userId
            ? nextWorkspace.project : originRef.current;
          sendWorkspace();
          originRef.current = nextWorkspace.project;
          setProjectOrigin(nextWorkspace.project);
          applyWorkspace(nextWorkspace);
        };

        channel
          .on("broadcast", { event: "workspace-files" }, ({ payload }) => {
            if (!acceptSender(payload)) return;
            const next = applyLiveFileUpdates(documentRef.current, payload.files);
            if (!next) {
              void channel?.send({ type: "broadcast", event: "workspace-request", payload: { userId, clientId } });
              return;
            }
            sendWorkspace();
            applyWorkspace(next);
          })
          .on("broadcast", { event: "cursor-update" }, ({ payload }) => {
            if (!acceptSender(payload) || typeof payload.userId !== "string" || payload.userId === userId) return;
            const selection = parseLiveEditorSelection(payload.selection);
            if (payload.selection !== null && !selection) return;
            setPeers(current => current.map(peer => peer.userId === payload.userId ? { ...peer, selection } : peer));
          })
          .on("broadcast", { event: "workspace-request" }, ({ payload }) => {
            const currentRoom = currentRoomRef.current;
            if (!acceptSender(payload) || !currentRoom || currentRoom.owner_id !== userId) return;
            void channel?.send({ type: "broadcast", event: "workspace-update", payload: { userId, clientId, targetClientId: payload?.clientId, workspace: serializeLiveWorkspace(documentRef.current) } });
          })
          .on("broadcast", { event: "workspace-update" }, ({ payload }) => {
            applyIncomingWorkspace(payload as WorkspaceBroadcastPayload);
          })
          .on("broadcast", { event: "code-update" }, ({ payload }) => {
            applyIncomingWorkspace(payload as WorkspaceBroadcastPayload);
          })
          .on("broadcast", { event: "participant-removed" }, ({ payload }) => {
            if ((payload as { userId?: string })?.userId === userId) {
              void verifyMembership();
            }
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` }, ({ new: participant }) => {
            if (!active) return;
            if (participant.status === "removed" && typeof participant.user_id === "string") {
              removedParticipantIdsRef.current.add(participant.user_id);
              setPeers(current => current.filter(peer => peer.userId !== participant.user_id));
              setParticipantIds(current => current.filter(id => id !== participant.user_id));
              if (participant.user_id === userId) revokeAccess();
            } else if (typeof participant.user_id === "string" && participant.status === "accepted") {
              removedParticipantIdsRef.current.delete(participant.user_id);
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
              if (!active) return;
              const updatedRoom = nextRoom as LiveRoom;
              if (updatedRoom.status === "closed" && membershipTimer) clearInterval(membershipTimer);
              currentRoomRef.current = updatedRoom;
              setRoom(updatedRoom);
              setStatus(updatedRoom.status === "closed" ? "closed" : "connected");
              if (updatedRoom.status === "closed") {
                accessEndedRef.current = true;
                broadcastRef.current?.cancel();
                cursorBroadcastRef.current?.cancel();
                if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
                pendingPersistRef.current = null;
                setPeers([]);
                if (updatedRoom.owner_id !== userId) onAccessEnded();
                if (channelRef.current === channel) channelRef.current = null;
                if (channel) void supabase.removeChannel(channel);
                void queryClient.invalidateQueries({ queryKey: ["livecode"] });
              }
            }
          )
          .on("presence", { event: "sync" }, () => {
            if (!active || !channel) return;
            const ids = Object.keys(channel.presenceState()).filter(id => !removedParticipantIdsRef.current.has(id));
            setParticipantIds(ids.length ? ids : [userId!]);
            const presentPeers = getLiveEditorPeers(channel.presenceState(), userId!).filter(peer => !removedParticipantIdsRef.current.has(peer.userId));
            setPeers(current => presentPeers.map(peer => {
              const existing = current.find(candidate => candidate.userId === peer.userId);
              return existing ? { ...peer, selection: existing.selection } : peer;
            }));
            cursorBroadcastRef.current?.schedule();
          })
          .subscribe(async (nextStatus) => {
            if (!active) return;
            if (nextStatus === "SUBSCRIBED") {
              if (!channel) return;
              presenceRef.current = {
                user_id: userId,
                username: usernameRef.current || "User",
                online_at: new Date().toISOString(),
              };
              subscribed = true;
              void channel.track({ ...presenceRef.current, selection: selectionRef.current });
              cursorBroadcastRef.current?.schedule();
              broadcastRef.current?.schedule();
              if (!active) return;
              setStatus(currentRoomRef.current?.status === "closed" ? "closed" : "connected");
              if (roomData.owner_id !== userId) {
                void verifyMembership();
                if (membershipTimer) clearInterval(membershipTimer);
                membershipTimer = setInterval(() => void verifyMembership(), 10_000);
              }
              if (roomData.owner_id !== userId) void channel.send({ type: "broadcast", event: "workspace-request", payload: { userId, clientId } });
            }
            if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
              subscribed = false;
              setError("Realtime connection failed. Retrying may be required.");
              setStatus("error");
            }
            if (nextStatus === "CLOSED") {
              subscribed = false;
              if (currentRoomRef.current?.status !== "closed") setStatus("connecting");
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
      broadcastRef.current?.flush();
      active = false;
      if (membershipTimer) clearInterval(membershipTimer);
      broadcastRef.current?.cancel();
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistStartedRef.current = null;
      if (pendingPersistRef.current?.roomId === roomId) {
        enqueueSave(pendingPersistRef.current);
        pendingPersistRef.current = null;
      }
      cursorBroadcastRef.current?.cancel();
      cursorBroadcastRef.current = null;
      if (channelRef.current === channel) channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enqueueSave, onAccessEnded, onRemoteWorkspace, persistWorkspace, queryClient, roomId, userId]);

  useEffect(() => {
    if (!roomId || status !== "connected" || !channelRef.current) return;

    if (remoteFingerprintRef.current === documentFingerprint) {
      return;
    }

    persistWorkspace(documentRef.current);
    broadcastRef.current?.schedule();
  }, [documentFingerprint, persistWorkspace, roomId, status, userId]);

  const copyInviteLink = useCallback(async () => {
    if (!roomId) return false;
    await navigator.clipboard.writeText(
      getLiveWorkspaceUrl(roomId, window.location.origin)
    );
    return true;
  }, [roomId]);

  const flushWorkspace = useCallback(async () => {
    if (accessEndedRef.current || !roomId || currentRoomRef.current?.id !== roomId || currentRoomRef.current.status !== "active") return;
    broadcastRef.current?.flush();
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistStartedRef.current = null;
    pendingPersistRef.current = null;
    await saveQueueRef.current;
    await api.live.saveCode(roomId, serializeLiveWorkspace(documentRef.current));
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ["editor-snippets"] });
  }, [queryClient, roomId]);

  const closeSession = useCallback(async () => {
    if (!roomId || currentRoomRef.current?.owner_id !== userId) return false;
    await flushWorkspace();
    await api.live.closeRoom(roomId);
    currentRoomRef.current = currentRoomRef.current
      ? { ...currentRoomRef.current, status: "closed" }
      : null;
    setRoom(currentRoomRef.current);
    setStatus("closed");
    return true;
  }, [flushWorkspace, roomId, userId]);

  const removeParticipant = useCallback(async (participantId: string) => {
    const currentRoom = currentRoomRef.current;
    if (!roomId || currentRoom?.id !== roomId || currentRoom.owner_id !== userId || participantId === userId || currentRoom.status === "closed") {
      throw new Error("Only the active session owner can remove other members.");
    }
    await api.live.removeRoomParticipant(roomId, participantId);
    if (currentRoomRef.current?.id !== roomId) {
      void queryClient.invalidateQueries({ queryKey: ["livecode"] });
      return;
    }
    removedParticipantIdsRef.current.add(participantId);
    setPeers(current => current.filter(peer => peer.userId !== participantId));
    setParticipantIds(current => current.filter(id => id !== participantId));
    void channelRef.current?.send({ type: "broadcast", event: "participant-removed", payload: { userId: participantId } });
    void queryClient.invalidateQueries({ queryKey: ["livecode"] });
  }, [queryClient, roomId, userId]);

  return {
    room,
    status,
    error,
    peers,
    projectOrigin,
    publishSelection,
    participantCount: Math.max(participantIds.length, room ? 1 : 0),
    isOwner: Boolean(room && room.owner_id === userId),
    copyInviteLink,
    closeSession,
    removeParticipant,
    flushWorkspace,
  };
}
