"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus, Clock, Activity } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/components/LanguageProvider";

type LiveCodeData = {
  rooms: any[];
  invites: any[];
  userId: string | null;
};

export default function LiveCodePage() {
  const [participantsMap, setParticipantsMap] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [creating, setCreating] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  async function fetchParticipants(currentRooms: any[]) {
    const roomIds = currentRooms.map(r => r.id);
    const ownerIds = currentRooms.map(r => r.owner_id);

    const { data: participants } = await supabase
      .from("live_participants")
      .select("room_id, user_id")
      .in("room_id", roomIds);

    const userIds = [
      ...new Set([
        ...(participants ? participants.map(p => p.user_id) : []),
        ...ownerIds
      ])
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap: any = {};
    profiles?.forEach(p => {
      profileMap[p.id] = p;
    });

    userIds.forEach(id => {
      if (!profileMap[id]) {
        profileMap[id] = {
          id,
          username: "User",
          avatar_url: null,
        };
      }
    });

    const grouped: any = {};
    currentRooms.forEach(r => {
      grouped[r.id] = [];
    });

    (participants || []).forEach(p => {
      if (!grouped[p.room_id]) grouped[p.room_id] = [];
      grouped[p.room_id].push(profileMap[p.user_id]);
    });

    currentRooms.forEach(r => {
      if (!grouped[r.id].length) {
        const ownerProfile = profileMap[r.owner_id];
        if (ownerProfile) grouped[r.id].push(ownerProfile);
      }
    });

    setParticipantsMap(grouped);
  }

  async function loadLiveCodeData(): Promise<LiveCodeData> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      return {
        rooms: [],
        invites: [],
        userId: null,
      };
    }

    const { data: inviteData } = await supabase
      .from("room_participants")
      .select("room_id, live_rooms(*)")
      .eq("user_id", user.id)
      .eq("status", "invited");

    const { data: ownedRooms } = await supabase
      .from("live_rooms")
      .select("*")
      .eq("owner_id", user.id);

    const { data: participantRows } = await supabase
      .from("room_participants")
      .select("room_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const roomIds = participantRows?.map(r => r.room_id) || [];

    let participantRooms: any[] = [];
    if (roomIds.length) {
      const { data } = await supabase
        .from("live_rooms")
        .select("*")
        .in("id", roomIds);

      participantRooms = data || [];
    }

    const merged = [...(ownedRooms || []), ...participantRooms];
    const uniqueMap: any = {};
    merged.forEach(r => {
      uniqueMap[r.id] = r;
    });

    const finalRooms = Object.values(uniqueMap).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (finalRooms.length) {
      await fetchParticipants(finalRooms);
    }

    return {
      rooms: finalRooms,
      invites: inviteData || [],
      userId: user.id,
    };
  }

  const {
    data: livecodeData,
    isLoading: loading,
  } = useQuery<LiveCodeData>({
    queryKey: ["livecode"],
    queryFn: loadLiveCodeData,
  });

  const rooms = livecodeData?.rooms || [];
  const invites = livecodeData?.invites || [];
  const userId = livecodeData?.userId || null;

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

    const { data, error } = await supabase
      .from("live_rooms")
      .insert({
        owner_id: userId,
        name: sessionName || t("livecode.dialog.untitled"),
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Create session error:", error);
      setCreating(false);
      return;
    }

    if (data) {
      await queryClient.invalidateQueries({
        queryKey: ["livecode"],
      });
      setOpen(false);
      setSessionName("");
      setCreating(false);
      router.push(`/live/${data.id}`);
    }
  }

  async function acceptInvite(roomId: string) {
    await supabase
      .from("room_participants")
      .update({ status: "accepted" })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    await queryClient.invalidateQueries({
      queryKey: ["livecode"],
    });
  }

  async function declineInvite(roomId: string) {
    await supabase
      .from("room_participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    await queryClient.invalidateQueries({
      queryKey: ["livecode"],
    });
  }

  const activeRooms = rooms.filter((r) => r.status === "active");
  const pastRooms = rooms.filter((r) => r.status === "closed");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("livecode.title")}</h1>
          <p className="text-muted-foreground">
            {t("livecode.subtitle")}
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
          <Plus size={16} />
          {t("livecode.createSession")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t("livecode.stats.total")}</CardTitle>
            <Activity className="w-4 h-4" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Skeleton className="h-8 w-10" /> : rooms.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t("livecode.stats.active")}</CardTitle>
            <Activity className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Skeleton className="h-8 w-10" /> : activeRooms.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t("livecode.stats.past")}</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Skeleton className="h-8 w-10" /> : pastRooms.length}
          </CardContent>
        </Card>

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
                    <p className="text-sm text-muted-foreground">
                      {t("livecode.sessions.noActive")}
                    </p>
                  )}

                  {activeRooms.map((room) => (
                    <Card
                      key={room.id}
                      onClick={() => router.push(`/live/${room.id}`)}
                      className="cursor-pointer hover:scale-[1.01] transition"
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{room.name || t("livecode.sessions.fallbackName")}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(room.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex -space-x-2">
                          {(participantsMap[room.id] || [])
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((u, i) => (
                              <Avatar key={i} className="w-6 h-6 border">
                                {u?.avatar_url ? (
                                  <AvatarImage src={u.avatar_url} />
                                ) : null}
                                <AvatarFallback>
                                  {u?.username?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                            ))}

                          {(participantsMap[room.id] || []).filter(Boolean).length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border">
                              +{(participantsMap[room.id] || []).filter(Boolean).length - 3}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-[2px] rounded ${
                              room.owner_id === userId
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {room.owner_id === userId ? t("livecode.roles.owner") : t("livecode.roles.member")}
                          </span>
                          <span className="text-sm text-green-500">{t("livecode.status.active")}</span>
                        </div>
                      </CardContent>
                    </Card>
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
                    <p className="text-sm text-muted-foreground">
                      {t("livecode.sessions.noPast")}
                    </p>
                  )}

                  {pastRooms.map((room) => (
                    <Card
                      key={room.id}
                      onClick={() => router.push(`/live/${room.id}`)}
                      className="cursor-pointer hover:scale-[1.01] transition"
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{room.name || t("livecode.sessions.fallbackName")}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(room.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-[2px] rounded ${
                              room.owner_id === userId
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {room.owner_id === userId ? t("livecode.roles.owner") : t("livecode.roles.member")}
                          </span>
                          <span className="text-sm text-muted-foreground">{t("livecode.status.closed")}</span>
                        </div>
                      </CardContent>
                    </Card>
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
                  <p className="text-sm text-muted-foreground">
                    {t("livecode.invites.empty")}
                  </p>
                )}

                <div className="space-y-2">
                  {invites.map((inv) => {
                    const room = inv.live_rooms;

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