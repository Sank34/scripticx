"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function LiveRoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();

  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [code, setCode] = useState("");
  const [user, setUser] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  useEffect(() => {
    async function loadProfiles() {
      const ids = Array.from(new Set([
        ...participants.map(p => p.user_id),
        ...messages.map(m => m.userId || m.user_id).filter(Boolean)
      ]));
      if (!ids.length) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, github, twitter, website")
        .in("id", ids);

      if (data) {
        const map: any = {};
        data.forEach(p => { map[p.id] = p; });
        setProfilesMap(map);
      }
    }

    loadProfiles();
  }, [participants, messages]);

  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const hoverTimeout = useRef<any>(null);
  const [message, setMessage] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .limit(50);

      if (data) setUsers(data);
    }

    loadUsers();
  }, []);

  // Invite user to room, with duplicate check and toasts
  async function inviteUser(targetId: string) {
    try {
      // check if already participant or invited
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id, status")
        .eq("room_id", roomId)
        .eq("user_id", targetId)
        .maybeSingle();

      if (existing) {
        toast.error(existing.status === "accepted" ? "User already in session" : "User already invited");
        return;
      }

      const { error } = await supabase
        .from("room_participants")
        .insert({
          room_id: roomId,
          user_id: targetId,
          status: "invited",
        });

      if (error) {
        toast.error("Failed to send invite");
        return;
      }

      toast.success("Invite sent");
    } catch (e) {
      toast.error("Unexpected error");
    }
  }
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const [mousePositions, setMousePositions] = useState<Record<string, {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    lastSeen: number;
  }>>({});

  const [output, setOutput] = useState<string[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [waitingInput, setWaitingInput] = useState<string | null>(null);
  async function runCode() {
    try {
      const parsed = code.split("\n").map(parseLine);
      setProgram(parsed);
      reset();

      let out: string[] = [];
      let res;

      while (true) {
        res = step(parsed);
        if (!res) break;

        if ((res as any).inputRequest) {
          setWaitingInput((res as any).inputRequest);
          break;
        }

        if (res.output !== null) {
          out.push(String(res.output));
        }
      }

      setOutput(out);
    } catch (e: any) {
      setOutput(["Error: " + e.message]);
    }
  }

  function continueRun() {
    try {
      let out: string[] = [];
      let res;

      while (true) {
        res = step(program);
        if (!res) break;

        if ((res as any).inputRequest) {
          setWaitingInput((res as any).inputRequest);
          break;
        }

        if (res.output !== null) {
          out.push(String(res.output));
        }
      }

      if (out.length) {
        setOutput((prev) => [...prev, ...out]);
      }
    } catch (e: any) {
      setOutput(["Error: " + e.message]);
    }
  }

  function stepCode() {
    try {
      if (!program.length) {
        const parsed = code.split("\n").map(parseLine);
        setProgram(parsed);
        reset();
        return;
      }

      const res = step(program);

      if (!res) {
        setRunning(false);
        return;
      }

      if ((res as any).inputRequest) {
        setWaitingInput((res as any).inputRequest);
        return;
      }

      if (res.output !== null) {
        setOutput((prev) => [...prev, String(res.output)]);
      }
    } catch (e: any) {
      setOutput(["Error: " + e.message]);
    }
  }

  function submitInput() {
    if (!waitingInput) return;

    const val = Number(inputValue);
    setVariable(waitingInput, isNaN(val) ? inputValue : val);
    advanceLine();

    setInputValue("");
    setWaitingInput(null);

    continueRun();
  }

  function clearOutput() {
    setOutput([]);
    reset();
    setProgram([]);
  }

  const channelRef = useRef<any>(null);
  const isRemote = useRef(false);
  const saveTimeout = useRef<any>(null);
  const userRef = useRef<any>(null);

  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;

    if (monaco.languages.getLanguages().some(l => l.id === "miniscriptplus")) {
      return;
    }

    monaco.languages.register({ id: "miniscriptplus" });

    monaco.languages.setMonarchTokensProvider("miniscriptplus", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          [/\b(IF|THEN|ELSE|END|WHILE|PRINT|INPUT)\b/, "keyword"],
          [/\b(true|false)\b/, "constant"],
          [/[0-9]+/, "number"],
          [/".*?"/, "string"],
          [/<=|>=|==|!=|<|>/, "operator"],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
        ],
      },
    });

    monaco.editor.defineTheme("miniscriptplusTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "c586c0" },
        { token: "number", foreground: "b5cea8" },
        { token: "string", foreground: "ce9178" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "constant", foreground: "569cd6" },
      ],
      colors: {},
    });
  }, [monaco]);

  function getUserColor(id: string) {
    const colors = ["#ff4d4f","#40a9ff","#73d13d","#ffa940","#9254de","#13c2c2"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[hash % colors.length];
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);
      userRef.current = currentUser;

      const { data: roomData } = await supabase
        .from("live_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (!roomData) {
        router.replace("/livecode");
        return;
      }

      setRoom(roomData);
      setCode(roomData.code || "");

      const { data: chatData } = await supabase
        .from("live_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (chatData) setMessages(chatData);

      setLoading(false);

      const channel = supabase.channel(`room-${roomId}`, {
        config: {
          broadcast: {
            self: true,
          },
          presence: {
            key: currentUser.id,
          },
        },
      });

      channel.on("broadcast", { event: "code-update" }, (payload: any) => {
        if (payload?.payload?.userId === currentUser.id) return;
        isRemote.current = true;
        setCode(payload.payload.code);
      });

      channel.on("broadcast", { event: "mouse-move" }, (payload: any) => {
        const { userId, x, y } = payload.payload || {};
        if (!userId) return;

        setMousePositions((prev) => {
          const existing = prev[userId];

          return {
            ...prev,
            [userId]: {
              x: existing?.x ?? x,
              y: existing?.y ?? y,
              targetX: x,
              targetY: y,
              lastSeen: Date.now(),
            },
          };
        });
      });

      channel.on("broadcast", { event: "chat-message" }, (payload: any) => {
        const msg = payload.payload;
        if (!msg) return;

        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              (m.id && msg.id && m.id === msg.id) ||
              (
                (m.created_at || m.createdAt) === (msg.created_at || msg.createdAt) &&
                (m.user_id || m.userId) === (msg.user_id || msg.userId)
              )
          );
          if (exists) return prev;
          return [...prev, msg];
        });
      });

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const raw = Object.values(state).flat();

        const uniqueMap = new Map();

        raw.forEach((p: any) => {
          if (!uniqueMap.has(p.user_id)) {
            uniqueMap.set(p.user_id, {
              user_id: p.user_id,
              username: p.username,
              avatar_url: p.avatar_url,
            });
          }
        });

        setParticipants(Array.from(uniqueMap.values()));
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await supabase.from("live_participants").upsert({
            room_id: roomId,
            user_id: currentUser.id,
          });

          try {
            await supabase
              .from("room_participants")
              .insert({
                room_id: roomId,
                user_id: currentUser.id,
              })
              .select()
              .single();
          } catch {}

          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", currentUser.id)
            .maybeSingle();

          await channel.track({
            user_id: currentUser.id,
            username: profile?.username || "User",
            avatar_url: profile?.avatar_url || null,
            online_at: new Date().toISOString(),
          });
        }
      });
      channelRef.current = channel;
    }

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (userRef.current) {
        supabase
          .from("live_participants")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", userRef.current.id);
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (!room || room.status !== "closed") return;

    async function loadAllParticipants() {
      const { data: dbParticipants } = await supabase
        .from("room_participants")
        .select("user_id")
        .eq("room_id", roomId);

      if (!dbParticipants) return;

      const ids = dbParticipants.map(p => p.user_id);
      if (!ids.length) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);

      if (profiles) {
        setAllParticipants(profiles);
      }
    }

    loadAllParticipants();
  }, [room?.status, roomId]);

  useEffect(() => {
    let raf: any;

    function animate() {
      setMousePositions((prev) => {
        const next: any = {};

        Object.entries(prev).forEach(([id, pos]: any) => {
          const lerpFactor = 0.25;

          const newX = pos.x + (pos.targetX - pos.x) * lerpFactor;
          const newY = pos.y + (pos.targetY - pos.y) * lerpFactor;

          next[id] = {
            ...pos,
            x: newX,
            y: newY,
          };
        });

        return next;
      });

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let rafId: any = null;

    function handleMove(e: MouseEvent) {
      if (!channelRef.current || !userRef.current) return;

      const payload = {
        userId: userRef.current.id,
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };

      channelRef.current.send({
        type: "broadcast",
        event: "mouse-move",
        payload,
      });

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        channelRef.current.send({
          type: "broadcast",
          event: "mouse-move",
          payload,
        });
      });
    }

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMousePositions((prev) => {
        const now = Date.now();
        const next: any = {};

        Object.entries(prev).forEach(([id, data]: any) => {
          if (now - data.lastSeen < 1500) {
            next[id] = data;
          }
        });

        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  async function sendMessage() {
    if (!message.trim() || !channelRef.current || !userRef.current) return;

    const msg = {
      id: `${Date.now()}-${Math.random()}`,
      text: message,
      userId: userRef.current.id,
      createdAt: new Date().toISOString(),
    };

    channelRef.current.send({
      type: "broadcast",
      event: "chat-message",
      payload: msg,
    });

    await supabase.from("live_messages").insert({
      room_id: roomId,
      user_id: msg.userId,
      text: msg.text,
    });

    setMessage("");
  }

  async function shareSession() {
    const url = `${window.location.origin}/live/${roomId}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("live.shareCopied"));
  }

  function handleChange(value: string) {
    if (!room || room.status === "closed") return;

    setCode(value);

    if (isRemote.current) {
      isRemote.current = false;
      return;
    }

    if (!channelRef.current) return;

    channelRef.current?.send({
      type: "broadcast",
      event: "code-update",
      payload: { code: value, userId: userRef.current?.id }
    });

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from("live_rooms")
        .update({ code: value })
        .eq("id", roomId);
    }, 1000);
  }

  async function closeSession() {
    if (!room || user?.id !== room.owner_id) return;

    await supabase
      .from("live_rooms")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", roomId);

    setRoom((prev: any) => ({ ...prev, status: "closed" }));
  }

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isOwner = user?.id === room.owner_id;

  return (
    <div className="w-full">
      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Session</h1>
            <div className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">
                {room.name || "Untitled Session"}
              </span>
              <span> - </span>
              <span className="font-mono">{room.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={shareSession}
              className="flex items-center gap-2"
            >
              <Share2 size={16} />
              Share
            </Button>

            {isOwner && room.status === "active" && (
              <Button variant="secondary" onClick={() => setInviteOpen(true)}>
                Invite
              </Button>
            )}

            {isOwner && room.status === "active" && (
              <Button variant="destructive" onClick={closeSession}>
                End Session
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {participants.length} online
          </span>

          <div className="flex items-center gap-2">
            {participants.map((p, i) => {
              const profile = profilesMap[p.user_id];
              const isMe = p.user_id === user?.id;

              return (
                <div
                  key={i}
                  className="relative inline-block"
                  onMouseEnter={() => {
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setHoveredUser(p.user_id);
                  }}
                  onMouseLeave={() => {
                    hoverTimeout.current = setTimeout(() => {
                      setHoveredUser(null);
                    }, 150);
                  }}
                >
                  <Link href={`/u/${p.username}`}>
                    <div className="flex items-center gap-1 text-xs cursor-pointer">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Tooltip */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 mt-2 transition-opacity duration-150 z-50 ${
                      hoveredUser === p.user_id
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div
                      className="w-56 p-3 rounded-lg border bg-background shadow-lg space-y-2 text-xs"
                      onMouseEnter={() => {
                        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                        setHoveredUser(p.user_id);
                      }}
                      onMouseLeave={() => {
                        hoverTimeout.current = setTimeout(() => {
                          setHoveredUser(null);
                        }, 150);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {p.username?.[0]?.toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="font-medium">
                            {p.username} {isMe && "(You)"}
                          </div>
                        </div>
                      </div>

                      {profile?.bio && (
                        <div className="text-muted-foreground">{profile.bio}</div>
                      )}

                      <div className="flex gap-2">
                        {profile?.github && (
                          <a href={profile.github} target="_blank" className="underline">GitHub</a>
                        )}
                        {profile?.twitter && (
                          <a href={profile.twitter} target="_blank" className="underline">Twitter</a>
                        )}
                        {profile?.website && (
                          <a href={profile.website} target="_blank" className="underline">Website</a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {room.status === "closed" && (
          <div className="text-sm text-muted-foreground">
            This session has ended. You can view the code but cannot edit.
          </div>
        )}

        <div className="space-y-3">

        <div className="flex gap-2">
          <Button onClick={runCode}>Run</Button>
          <Button variant="secondary" onClick={stepCode}>Step</Button>
          <Button variant="outline" onClick={clearOutput}>Clear</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <div className="border rounded overflow-hidden min-w-0 max-w-full">
              <Editor
                height="400px"
                defaultLanguage="miniscriptplus"
                theme="miniscriptplusTheme"
                value={code}
                onChange={(value) => handleChange(value || "")}
                options={{
                  fontSize: 14,
                  fontFamily: "JetBrains Mono, monospace",
                  minimap: { enabled: false },
                  padding: { top: 12 },
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  cursorSmoothCaretAnimation: "on",
                  cursorBlinking: "smooth",
                  scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                  readOnly: room.status === "closed",
                  wrappingIndent: "same",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debugger</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <div className="bg-black text-green-400 font-mono text-sm p-3 rounded h-40 overflow-auto">
              {output.length === 0 && <div className="opacity-50">No output</div>}
              {output.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {/* Input UI */}
            {waitingInput && (
              <div className="border rounded-lg p-3 mt-2 flex gap-2 items-center">
                <span className="text-sm">Input {waitingInput}:</span>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  placeholder="Enter value..."
                />
                <Button size="sm" onClick={submitInput}>OK</Button>
              </div>
            )}
          </CardContent>
        </Card>

        </div>
      </div>

      <div className="space-y-4">

        {/* User Panel */}
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-3">Users</div>

          <div className="space-y-2">
            {(() => {
              const onlineIds = new Set(participants.map(p => p.user_id));

              const onlineUsers = participants.map(p => ({
                id: p.user_id,
                username: p.username,
                avatar_url: p.avatar_url,
                online: true
              }));

              const extraUsersSource =
                room.status === "closed"
                  ? allParticipants
                  : Object.values(profilesMap);

              const extraUsers = extraUsersSource
                .filter((p: any) => !onlineIds.has(p.user_id || p.id))
                .map((p: any) => ({
                  id: p.user_id || p.id,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  online: false
                }));

              const merged = [...onlineUsers, ...extraUsers];

              return merged.map((p: any) => {
                const isOwnerUser = p.id === room.owner_id;

                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium">{p.username}</span>

                      {isOwnerUser && (
                        <span className="text-[10px] px-2 py-[2px] bg-primary text-white rounded">
                          Owner
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.online
                          ? "bg-green-500"
                          : "bg-gray-400 opacity-50"
                      }`}
                    />
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Chat Panel */}
        {room.status === "active" && (
        <div className="flex flex-col border rounded-lg overflow-hidden h-[400px]">
          <div className="p-3 border-b text-sm font-medium">
            Chat
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => {
              const isMe = (m.userId || m.user_id) === user?.id;
              const userId = m.userId || m.user_id;
              const u =
                participants.find((p) => (p.user_id || p.id) === userId) ||
                allParticipants.find((p) => (p.user_id || p.id) === userId) ||
                profilesMap[userId];
              const time = new Date(m.createdAt || m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={`${m.id || ""}-${m.created_at || ""}-${m.userId || m.user_id || ""}`}
                  className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    u?.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {u?.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )
                  )}
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg text-sm break-words whitespace-pre-wrap ${
                      isMe
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-muted rounded-bl-none"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-medium mb-1 opacity-70">
                        {u?.username || "User"}
                      </div>
                    )}
                    <div className="break-words whitespace-pre-wrap">{m.text}</div>
                    <div className="text-[10px] opacity-60 mt-1 text-right">
                      {time}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 border-t flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <Button size="sm" onClick={sendMessage} className="px-3">
              Send
            </Button>
          </div>
        </div>
        )}

      </div>

      {Object.entries(mousePositions).map(([id, pos]) => {
        if (id === user?.id) return null;

        const userData = participants.find((p) => p.user_id === id);
        const opacity = Math.max(0, 1 - (Date.now() - pos.lastSeen) / 1500);

        return (
          <div
            key={id}
            style={{
              position: "fixed",
              left: pos.x * window.innerWidth,
              top: pos.y * window.innerHeight,
              transform: "translate(-50%, -50%) translateZ(0)",
              pointerEvents: "none",
              zIndex: 9999,
              transition: "opacity 0.2s ease",
              opacity,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  background: getUserColor(id),
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
              />

              {userData?.username && (
                <div
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background: getUserColor(id),
                    color: "white",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {userData.username}
                </div>
              )}
            </div>
          </div>
        );
      })}

    {/* Invite Modal */}
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
        </DialogHeader>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
        />
        <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
          {users
            .filter(u => u.id !== user?.id)
            .filter(u =>
              u.username?.toLowerCase().includes(search.toLowerCase())
            )
            .map((u) => {
              const isAlreadyInSession = participants.some(p => p.user_id === u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">{u.username}</span>
                  </div>
                  <Button
                    size="sm"
                    disabled={isAlreadyInSession}
                    onClick={() => inviteUser(u.id)}
                  >
                    {isAlreadyInSession ? "In session" : "Invite"}
                  </Button>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
      </div>
    </div>
  );
}