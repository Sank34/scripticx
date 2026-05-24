"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LiveCodeData, type LiveRoom } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { LiveRoomCard } from "@/components/live/LiveRoomCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus, Clock, Activity } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/LanguageProvider";

export default function LiveCodePage() {
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [creating, setCreating] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  async function loadLiveCodeData(): Promise<LiveCodeData> {
    return api.live.getLiveCodeData();
  }

  const {
    data: livecodeData,
    isLoading: loading,
  } = useQuery<LiveCodeData>({
    queryKey: ["livecode"],
    queryFn: loadLiveCodeData,
  });

  const rooms = useMemo(() => livecodeData?.rooms || [], [livecodeData?.rooms]);
  const invites = livecodeData?.invites || [];
  const userId = livecodeData?.userId || null;
  const participantsMap = livecodeData?.participantsByRoom || {};

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`livecode-invites-${userId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("broadcast", { event: "invite" }, async () => {
        await queryClient.invalidateQueries({
          queryKey: ["livecode"],
        });
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await queryClient.invalidateQueries({
            queryKey: ["livecode"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  useEffect(() => {
    if (!rooms.length) return;

    const channel = supabase
      .channel("participants-livecode")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_participants",
        },
        async () => {
          await queryClient.invalidateQueries({
            queryKey: ["livecode"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rooms, queryClient]);

  async function createRoom() {
    if (!userId || creating) return;

    setCreating(true);

    try {
      const data = await api.live.createRoom(
        userId,
        sessionName || t("livecode.dialog.untitled")
      );

      await queryClient.invalidateQueries({
        queryKey: ["livecode"],
      });
      setOpen(false);
      setSessionName("");
      setCreating(false);
      router.push(`/live/${data.id}`);
    } catch (error) {
      console.error("Create session error:", error);
      setCreating(false);
    }
  }

  async function acceptInvite(roomId: string) {
    if (!userId) return;

    await api.live.acceptInvite(roomId, userId);

    await queryClient.invalidateQueries({
      queryKey: ["livecode"],
    });
  }

  async function declineInvite(roomId: string) {
    if (!userId) return;

    await api.live.declineInvite(roomId, userId);

    await queryClient.invalidateQueries({
      queryKey: ["livecode"],
    });
  }

  const activeRooms = rooms.filter((r) => r.status === "active");
  const pastRooms = rooms.filter((r) => r.status === "closed");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <PageHeader
        title={t("livecode.title")}
        subtitle={t("livecode.subtitle")}
        action={
          <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
            <Plus size={16} />
            {t("livecode.createSession")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <StatCard
          icon={<Activity className="w-4 h-4" />}
          title={t("livecode.stats.total")}
          value={loading ? <Skeleton className="h-8 w-10" /> : rooms.length}
        />

        <StatCard
          icon={<Activity className="w-4 h-4 text-green-500" />}
          title={t("livecode.stats.active")}
          value={loading ? <Skeleton className="h-8 w-10" /> : activeRooms.length}
        />

        <StatCard
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
          title={t("livecode.stats.past")}
          value={loading ? <Skeleton className="h-8 w-10" /> : pastRooms.length}
        />

      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <Card>
              <CardHeader>
                <CardTitle>{t("livecode.sessions.activeTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 p-1">
                  {activeRooms.length === 0 && (
                    <EmptyState className="py-6" title={t("livecode.sessions.noActive")} />
                  )}

                  {activeRooms.map((room) => (
                    <LiveRoomCard
                      key={room.id}
                      fallbackName={t("livecode.sessions.fallbackName")}
                      memberLabel={t("livecode.roles.member")}
                      onOpen={() => router.push(`/live/${room.id}`)}
                      ownerLabel={t("livecode.roles.owner")}
                      participants={participantsMap[room.id] || []}
                      room={room}
                      statusLabel={t("livecode.status.active")}
                      statusTone="active"
                      userId={userId}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("livecode.sessions.pastTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 p-1">
                  {pastRooms.length === 0 && (
                    <EmptyState className="py-6" title={t("livecode.sessions.noPast")} />
                  )}

                  {pastRooms.map((room) => (
                    <LiveRoomCard
                      key={room.id}
                      fallbackName={t("livecode.sessions.fallbackName")}
                      memberLabel={t("livecode.roles.member")}
                      onOpen={() => router.push(`/live/${room.id}`)}
                      ownerLabel={t("livecode.roles.owner")}
                      room={room}
                      statusLabel={t("livecode.status.closed")}
                      userId={userId}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="h-fit">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t("livecode.invites.title")}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {invites.length === 0 && (
                  <EmptyState className="py-4" title={t("livecode.invites.empty")} />
                )}

                <div className="space-y-2">
                  {invites.map((inv) => {
                    const room = Array.isArray(inv.live_rooms)
                      ? inv.live_rooms[0] as LiveRoom | undefined
                      : inv.live_rooms;

                    return (
                      <div
                        key={inv.room_id}
                        className="flex items-center justify-between border rounded p-2"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {room?.name || "Session"}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => acceptInvite(inv.room_id)}>
                            {t("livecode.invites.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineInvite(inv.room_id)}
                          >
                            {t("livecode.invites.decline")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("livecode.dialog.title")}</DialogTitle>
          </DialogHeader>

          <Input
            placeholder={t("livecode.dialog.placeholder")}
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />

          <DialogFooter>
            <Button onClick={createRoom} disabled={!userId || creating}>
              {creating ? t("livecode.dialog.creating") : t("livecode.dialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
