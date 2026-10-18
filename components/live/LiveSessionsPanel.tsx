"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { respondToLiveInvitation } from "@/lib/live-invitations";
import {
  Check,
  Clock3,
  LoaderCircle,
  Link2,
  Plus,
  Radio,
  Square,
  UserPlus,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { InvitePeoplePicker } from "@/components/collaboration/InvitePeoplePicker";
import { LiveRoomChat } from "@/components/live/LiveRoomChat";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  api,
  type LiveCodeData,
  type LiveRoom,
  type MentionCandidate,
} from "@/lib/api";
import {
  serializeLiveWorkspace,
  type LiveWorkspaceDocument,
} from "@/lib/editor-live-workspace";
import { supabase } from "@/lib/supabase";

type LiveSessionsPanelProps = {
  workspace: LiveWorkspaceDocument;
  activeRoomId?: string | null;
  activeRoomName?: string | null;
  activeRoomStatus?: "idle" | "connecting" | "connected" | "closed" | "error";
  activeParticipantCount?: number;
  activeRoomIsOwner?: boolean;
  startRequest?: number;
  inviteRequest?: number;
  onInviteRequestHandled?: () => void;
  onOpenRoom: (roomId: string, options?: { created?: boolean }) => void;
  onCopyActiveRoom?: () => void;
  onEndActiveRoom?: () => void;
  onLeaveActiveRoom?: () => void;
  onRemoveParticipant?: (userId: string) => Promise<void>;
};

function getInviteRoom(invite: LiveCodeData["invites"][number]) {
  return Array.isArray(invite.live_rooms)
    ? invite.live_rooms[0] || null
    : invite.live_rooms || null;
}

export function LiveSessionsPanel({
  workspace,
  activeRoomId = null,
  activeRoomName = null,
  activeRoomStatus = "idle",
  activeParticipantCount = 0,
  activeRoomIsOwner = false,
  startRequest = 0,
  inviteRequest = 0,
  onInviteRequestHandled,
  onOpenRoom,
  onCopyActiveRoom,
  onEndActiveRoom,
  onLeaveActiveRoom,
  onRemoveParticipant,
}: LiveSessionsPanelProps) {
  const queryClient = useQueryClient();
  const { locale, t } = useLanguage();
  const ro = locale === "ro";
  const [createOpen, setCreateOpen] = useState(false);
  const handledStartRequest = useRef(0);
  const [sessionName, setSessionName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removalBusy = useRef(false);
  const membersCloseRef = useRef<HTMLButtonElement>(null);

  const { data, isPending } = useQuery<LiveCodeData>({
    queryKey: ["livecode"],
    queryFn: () => api.live.getLiveCodeData(),
    staleTime: 20_000,
  });

  const rooms = useMemo(() => data?.rooms || [], [data?.rooms]);
  const activeRooms = rooms.filter((room) => room.status === "active");
  const pastRooms = rooms.filter((room) => room.status === "closed");
  const invites = data?.invites || [];
  const participantsByRoom = data?.participantsByRoom || {};
  const activeMembers = activeRoomId ? participantsByRoom[activeRoomId] || [] : [];
  const userId = data?.userId || null;
  const activeParticipantIds = useMemo(
    () =>
      new Set(
        (activeRoomId ? data?.participantsByRoom?.[activeRoomId] || [] : []).map(
          (participant) => participant.id
        )
      ),
    [activeRoomId, data?.participantsByRoom]
  );

  const inviteCandidatesQuery = useQuery<MentionCandidate[]>({
    queryKey: ["livecode", activeRoomId, "invite-candidates", inviteQuery],
    queryFn: () =>
      userId
        ? api.profiles.searchMentionCandidates(userId, inviteQuery, 20)
        : Promise.resolve([]),
    enabled: Boolean(inviteOpen && userId && activeRoomId && activeRoomIsOwner),
  });

  const inviteCandidates = (inviteCandidatesQuery.data || []).filter(
    (candidate) => !activeParticipantIds.has(candidate.id)
  );

  useEffect(() => {
    if (!startRequest || handledStartRequest.current === startRequest) return;
    handledStartRequest.current = startRequest;
    setSessionName(workspace.title);
    setCreateOpen(true);
  }, [startRequest, workspace.title]);

  useEffect(() => {
    if (!inviteRequest || !activeRoomId || !activeRoomIsOwner || activeRoomStatus !== "connected") return;
    setInviteOpen(true);
    onInviteRequestHandled?.();
  }, [activeRoomId, activeRoomIsOwner, activeRoomStatus, inviteRequest, onInviteRequestHandled]);

  useEffect(() => {
    if (activeRoomId && activeRoomIsOwner && activeRoomStatus === "connected") return;
    setInviteOpen(false);
    setMembersOpen(false);
    setInviteQuery("");
  }, [activeRoomId, activeRoomIsOwner, activeRoomStatus]);

  async function removeMember(memberId: string) {
    if (!activeRoomIsOwner || !onRemoveParticipant || memberId === userId || removalBusy.current) return;
    removalBusy.current = true;
    setRemovingId(memberId);
    try {
      await onRemoveParticipant(memberId);
      const roomId = activeRoomId;
      queryClient.setQueryData<LiveCodeData>(["livecode"], current => current && roomId ? {
        ...current,
        participantsByRoom: { ...current.participantsByRoom, [roomId]: (current.participantsByRoom[roomId] || []).filter(member => member.id !== memberId) },
      } : current);
      void queryClient.invalidateQueries({ queryKey: ["livecode"] });
      toast.success(ro ? "Membrul a fost eliminat din sesiune." : "Member removed from the session.");
    } catch {
      toast.error(ro ? "Membrul nu a putut fi eliminat. Încearcă din nou." : "Could not remove the member. Please try again.");
    } finally {
      removalBusy.current = false;
      setRemovingId(null);
    }
  }

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`editor-live-sessions-${userId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "invite" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["livecode"] });
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["livecode"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_rooms" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["livecode"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  function openRoom(roomId: string) {
    onOpenRoom(roomId);
  }

  async function createRoom() {
    if (!userId || creating || activeRoomId) return;

    setCreating(true);
    try {
      const room = await api.live.createRoom(
        userId,
        sessionName.trim() ||
          workspace.title.trim() ||
          t("livecode.dialog.untitled"),
        serializeLiveWorkspace(workspace)
      );

      await queryClient.invalidateQueries({ queryKey: ["livecode"] });
      setCreateOpen(false);
      setSessionName("");
      onOpenRoom(room.id, { created: true });
    } catch (error) {
      console.error("Create live session failed:", error);
      toast.error(
        ro
          ? "Sesiunea live nu a putut fi creată."
          : "The live session could not be created."
      );
    } finally {
      setCreating(false);
    }
  }

  async function acceptInvite(roomId: string) {
    if (!userId || pendingInviteId) return;

    setPendingInviteId(roomId);
    try {
      await respondToLiveInvitation(api.live, roomId, userId, "accept");
      await queryClient.invalidateQueries({ queryKey: ["livecode"] });
      openRoom(roomId);
    } catch {
      toast.error(
        ro ? "Invitația nu a putut fi acceptată." : "The invite could not be accepted."
      );
    } finally {
      setPendingInviteId(null);
    }
  }

  async function declineInvite(roomId: string) {
    if (!userId || pendingInviteId) return;

    setPendingInviteId(roomId);
    try {
      await respondToLiveInvitation(api.live, roomId, userId, "decline");
      await queryClient.invalidateQueries({ queryKey: ["livecode"] });
    } catch {
      toast.error(
        ro ? "Invitația nu a putut fi refuzată." : "The invite could not be declined."
      );
    } finally {
      setPendingInviteId(null);
    }
  }

  async function inviteParticipant(candidate: MentionCandidate) {
    if (!activeRoomId || !userId || !activeRoomIsOwner || activeRoomStatus !== "connected" || invitingId) return;

    setInvitingId(candidate.id);
    try {
      const existing = await api.live.getParticipant(activeRoomId, candidate.id);

      if (existing?.status === "accepted") {
        toast.info(t("live.toast.userInSession"));
        return;
      }

      if (existing?.status === "invited") {
        toast.info(t("live.toast.userInvited"));
        return;
      }

      await api.live.inviteUser(activeRoomId, candidate.id);
      await api.notifications.create({
        userId: candidate.id,
        actorId: userId,
        type: "live_invite",
        title: t("live.toast.inviteSent"),
        body: activeRoomName || t("live.untitledSession"),
        href: `/editor?live=${encodeURIComponent(activeRoomId)}&view=live`,
        metadata: {
          roomId: activeRoomId,
          roomName: activeRoomName || null,
        },
        locale,
      });

      await queryClient.invalidateQueries({ queryKey: ["livecode"] });
      toast.success(t("live.toast.inviteSent"));
    } catch (error) {
      console.error("Could not invite participant to Live Share:", error);
      toast.error(t("live.toast.inviteFailed"));
    } finally {
      setInvitingId(null);
    }
  }

  function renderRoom(room: LiveRoom, closed = false) {
    const participants = participantsByRoom[room.id] || [];
    const isOwner = room.owner_id === userId;

    return (
      <button
        key={room.id}
        type="button"
        disabled={closed && !isOwner}
        onClick={() => openRoom(room.id)}
        className={`group w-full rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent ${
          room.id === activeRoomId ? "bg-muted" : ""
        }`}
      >
        <span className="flex items-start gap-2.5">
          <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
            {closed ? <Clock3 className="size-3.5" /> : <Radio className="size-3.5" />}
            {!closed ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-emerald-500" />
            ) : null}
          </span>
          <span className="@container/room-details min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground">
              {room.name || t("livecode.sessions.fallbackName")}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{isOwner ? t("livecode.roles.owner") : t("livecode.roles.member")}</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
                <span aria-hidden="true">
                  {participants.length}
                  <span className="hidden @min-[11rem]/room-details:inline"> {ro ? "participanți" : "participants"}</span>
                </span>
                <span className="sr-only">{participants.length} {ro ? "participanți" : "participants"}</span>
              </span>
              {room.id === activeRoomId && !closed ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {ro ? "deschisă" : "open"}
                  </span>
                </span>
              ) : null}
            </span>
          </span>
          {participants.length ? (
            <span className="flex shrink-0 -space-x-1.5">
              {participants.slice(0, 2).map((participant) => (
                <UserAvatar
                  key={participant.id}
                  avatarUrl={participant.avatar_url}
                  username={participant.username}
                  equippedRewards={participant.equipped_rewards}
                  className="size-5 border border-background"
                />
              ))}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {ro ? "Colaborare live" : "Live collaboration"}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {activeRooms.length} {ro ? "sesiuni active" : "active sessions"}
          </p>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => {
            setSessionName(workspace.title);
            setCreateOpen(true);
          }}
          aria-label={t("livecode.createSession")}
          disabled={Boolean(activeRoomId)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {activeRoomId ? (
          <section className="mb-3 rounded-lg border bg-muted/25 p-2.5">
            <div className="flex items-start gap-2.5">
              <span className="relative mt-1 flex size-2 shrink-0">
                {activeRoomStatus === "connected" ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
                ) : null}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    activeRoomStatus === "connected"
                      ? "bg-emerald-500"
                      : activeRoomStatus === "error"
                        ? "bg-destructive"
                        : "bg-amber-500"
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {activeRoomName || (ro ? "Sesiune Live Share" : "Live Share session")}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {activeRoomStatus === "connected"
                    ? ro
                      ? `${activeParticipantCount} participanți conectați`
                      : `${activeParticipantCount} participants connected`
                    : activeRoomStatus === "connecting"
                      ? ro ? "Se conectează…" : "Connecting…"
                      : activeRoomStatus === "closed"
                        ? ro ? "Sesiune încheiată" : "Session ended"
                        : ro ? "Conexiune indisponibilă" : "Connection unavailable"}
                </p>
              </div>
            </div>
            <TooltipProvider delayDuration={250}>
              <div className="mt-2.5 flex items-center justify-end gap-1 border-t pt-2.5">
                {activeRoomIsOwner && activeRoomStatus === "connected" && onRemoveParticipant ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => setMembersOpen(true)} aria-label={ro ? "Gestionează membrii" : "Manage members"}>
                        <Users className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{ro ? "Gestionează membrii" : "Manage members"}</TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={onCopyActiveRoom}
                      disabled={!onCopyActiveRoom || activeRoomStatus !== "connected"}
                      aria-label={ro ? "Copiază linkul" : "Copy link"}
                    >
                      <Link2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    {ro ? "Copiază linkul" : "Copy link"}
                  </TooltipContent>
                </Tooltip>

                {activeRoomIsOwner && activeRoomStatus === "connected" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setInviteOpen(true)}
                        aria-label={t("live.invite")}
                      >
                        <UserPlus className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {t("live.invite")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}

                {activeRoomIsOwner && activeRoomStatus === "connected" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={onEndActiveRoom}
                        aria-label={ro ? "Oprește Live Share" : "Stop Live Share"}
                      >
                        <Square className="size-3.5 fill-current" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {ro ? "Oprește Live Share" : "Stop Live Share"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={onLeaveActiveRoom}
                        aria-label={ro ? "Ieși din sesiune" : "Leave session"}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {ro ? "Ieși din sesiune" : "Leave session"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
            {userId ? (
              <LiveRoomChat
                disabled={activeRoomStatus !== "connected"}
                locale={locale}
                roomId={activeRoomId}
                userId={userId}
              />
            ) : null}
          </section>
        ) : null}

        <Button
          type="button"
          size="sm"
          className="mb-3 w-full justify-start gap-2"
          onClick={() => {
            setSessionName(workspace.title);
            setCreateOpen(true);
          }}
          disabled={!userId || Boolean(activeRoomId)}
        >
          <Radio className="size-3.5" />
          {ro ? "Pornește Live Share" : "Start Live Share"}
        </Button>

        {workspace.files.length ? (
          <p className="mb-3 px-1 text-[10px] leading-relaxed text-muted-foreground">
            {ro
              ? `Întregul proiect va fi partajat: ${workspace.files.length} fișiere și structura directoarelor.`
              : `The entire project will be shared: ${workspace.files.length} files and its directory structure.`}
          </p>
        ) : null}

        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : (
          <div className="space-y-4">
            {invites.length ? (
              <section>
                <div className="mb-1 flex items-center justify-between px-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {t("livecode.invites.title")}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{invites.length}</span>
                </div>
                <div className="space-y-1">
                  {invites.map((invite) => {
                    const room = getInviteRoom(invite);
                    const busy = pendingInviteId === invite.room_id;
                    return (
                      <div key={invite.room_id} className="rounded-md border p-2">
                        <p className="truncate text-xs font-medium">
                          {room?.name || t("livecode.sessions.fallbackName")}
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <Button
                            type="button"
                            size="xs"
                            className="flex-1"
                            onClick={() => void acceptInvite(invite.room_id)}
                            disabled={Boolean(pendingInviteId)}
                          >
                            {busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />}
                            {t("livecode.invites.accept")}
                          </Button>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="outline"
                            onClick={() => void declineInvite(invite.room_id)}
                            disabled={Boolean(pendingInviteId)}
                            aria-label={t("livecode.invites.decline")}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-[10px] font-medium text-muted-foreground">
                  {t("livecode.sessions.activeTitle")}
                </p>
                <span className="text-[10px] text-muted-foreground">{activeRooms.length}</span>
              </div>
              {activeRooms.length ? (
                <div>{activeRooms.map((room) => renderRoom(room))}</div>
              ) : (
                <div className="rounded-md border border-dashed px-3 py-6 text-center">
                  <Users className="mx-auto size-4 text-muted-foreground/70" />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("livecode.sessions.noActive")}
                  </p>
                </div>
              )}
            </section>

            {pastRooms.length ? (
              <section className="border-t pt-3">
                <div className="mb-1 flex items-center justify-between px-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {t("livecode.sessions.pastTitle")}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{pastRooms.length}</span>
                </div>
                <div>{pastRooms.slice(0, 5).map((room) => renderRoom(room, true))}</div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={membersOpen && activeRoomIsOwner} onOpenChange={open => { if (!removalBusy.current) setMembersOpen(open); }}>
        <DialogContent showCloseButton={!removingId} onOpenAutoFocus={event => { event.preventDefault(); membersCloseRef.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle>{ro ? "Membrii sesiunii" : "Session members"}</DialogTitle>
            <DialogDescription>{ro ? "Poți elimina membri sau retrage invitații. Pentru a reveni, vor avea nevoie de o invitație nouă." : "Remove members or withdraw invitations. They will need a new invitation to return."}</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {activeMembers.length ? activeMembers.map(member => (
              <div key={member.id} className="flex min-w-0 items-center gap-2 rounded-md p-2">
                <UserAvatar avatarUrl={member.avatar_url} username={member.username} equippedRewards={member.equipped_rewards} className="size-7 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">{member.username || (ro ? "Utilizator" : "User")}</span>
                {member.id === userId ? <span className="text-xs text-muted-foreground">{ro ? "Proprietar" : "Owner"}</span> : (
                  <TooltipProvider delayDuration={250}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" size="icon-sm" variant="ghost" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={Boolean(removingId) || activeRoomStatus !== "connected"} onClick={() => void removeMember(member.id)} aria-label={ro ? `Elimină ${member.username || "membrul"}` : `Remove ${member.username || "member"}`}>
                          {removingId === member.id ? <LoaderCircle className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{ro ? "Elimină din sesiune" : "Remove from session"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )) : <p className="py-3 text-sm text-muted-foreground">{ro ? "Niciun membru disponibil." : "No members available."}</p>}
          </div>
          <DialogFooter><Button ref={membersCloseRef} variant="outline" disabled={Boolean(removingId)} onClick={() => setMembersOpen(false)}>{ro ? "Închide" : "Close"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ro ? "Pornește Live Share" : "Start Live Share"}</DialogTitle>
            <DialogDescription>
              {ro
                ? "Partajează proiectul complet și continuă să lucrezi în același editor."
                : "Share the complete project and keep working in the same editor."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createRoom();
            }}
            placeholder={t("livecode.dialog.placeholder")}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {ro ? "Anulează" : "Cancel"}
            </Button>
            <Button onClick={() => void createRoom()} disabled={!userId || creating || Boolean(activeRoomId)}>
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Radio className="size-4" />}
              {creating ? t("livecode.dialog.creating") : ro ? "Pornește" : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteQuery("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("live.inviteTitle")}</DialogTitle>
            <DialogDescription>{t("live.inviteDescription")}</DialogDescription>
          </DialogHeader>

          <div className="rounded-[var(--sx-radius-card)] border bg-muted/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {activeRoomName || t("live.untitledSession")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("live.inviteLinkDescription")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={onCopyActiveRoom}
                disabled={!onCopyActiveRoom}
              >
                <Link2 className="size-3.5" />
                {t("live.copyInviteLink")}
              </Button>
            </div>
          </div>

          <InvitePeoplePicker
            query={inviteQuery}
            onQueryChange={setInviteQuery}
            candidates={inviteCandidates}
            loading={inviteCandidatesQuery.isLoading}
            invitingId={invitingId}
            onInvite={inviteParticipant}
            placeholder={t("live.searchPlaceholder")}
            inviteLabel={t("live.inviteButton")}
            invitingLabel={t("live.inviting")}
            followingLabel={t("live.following")}
            userLabel={t("live.scripticxUser")}
            emptyTitle={t("live.noInviteUsers")}
            emptyDescription={t("live.noInviteUsersDescription")}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
