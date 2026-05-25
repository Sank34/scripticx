"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import type { OnMount } from "@monaco-editor/react";
import { useParams, useRouter } from "next/navigation";

import {
  api,
  type LiveMessage,
  type LiveRoom,
  type ProfileSummary,
  type RoomParticipant,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  advanceLine,
  parseLine,
  reset,
  setVariable,
  step,
  type StepResult,
} from "@/lib/engine";
import {
  analyzeMiniScriptComplexity,
  type ComplexityAnalysis,
} from "@/lib/complexity-analyzer";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { ComplexityAnalyzerCard } from "@/components/editor/ComplexityAnalyzerCard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { DebuggerStateCard } from "@/components/live/DebuggerStateCard";
import { LiveConsolePanel } from "@/components/live/LiveConsolePanel";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/LanguageProvider";

import {
  CheckCircle2,
  LogOut,
  MessageSquare,
  Play,
  Plus,
  Send,
  Share2,
  Square,
  Terminal,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type LiveParticipant = {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
};

type ParticipantProfile = ProfileSummary & {
  online: boolean;
};

type CursorPosition = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lastSeen: number;
  username?: string | null;
  avatar_url?: string | null;
};

type RunState = {
  output: string[];
  variables: Record<string, unknown>;
  currentLine: number;
};

type CursorDebugInfo = {
  statusLine: number;
  positionLine?: number;
  selectionLine?: number;
  modelLines?: number;
  focused?: boolean;
  supabaseLatencyMs?: number;
  supabasePingStatus?: "idle" | "ok" | "error" | "pending";
  supabasePingError?: string;
};

const EMPTY_RUN_STATE: RunState = {
  output: [],
  variables: {},
  currentLine: 0,
};

function getInitial(profile?: ProfileSummary | LiveParticipant | null) {
  return profile?.username?.[0]?.toUpperCase() || "U";
}

function getMessageUserId(message: LiveMessage) {
  return message.userId || message.user_id || "";
}

function getMessageTime(message: LiveMessage) {
  const value = message.createdAt || message.created_at;
  if (!value) return "";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessageKey(message: LiveMessage) {
  if (message.id) return message.id;

  return [
    getMessageUserId(message),
    message.created_at || message.createdAt || "",
    message.text,
  ].join(":");
}

function getUserColor(id: string) {
  const colors = ["#16a34a", "#2563eb", "#dc2626", "#9333ea", "#0891b2", "#ea580c"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return colors[hash % colors.length];
}

const MSP_TOKEN_PATTERN =
  /(#.*$|"(?:[^"\\]|\\.)*"|\b(?:IF|THEN|ELSE|END|WHILE|PRINT|INPUT|DIV|MOD|TRUE|FALSE|INT|TRUNC|FLOOR|ROUND|ABS|AND|OR|NOT)\b|\b\d+(?:\.\d+)?\b|<=|>=|==|!=|[+\-*/%<>=(),]|\b[a-zA-Z_][a-zA-Z0-9_]*\b|\s+|.)/g;

function getTokenClass(token: string) {
  if (/^#/.test(token)) return "text-emerald-700 italic";
  if (/^"/.test(token)) return "text-amber-700";
  if (/^\d/.test(token)) return "text-teal-700";
  if (/^(TRUE|FALSE)$/i.test(token)) return "text-blue-700";
  if (/^(IF|THEN|ELSE|END|WHILE|PRINT|INPUT|DIV|MOD|AND|OR|NOT)$/i.test(token)) {
    return "font-semibold text-violet-700";
  }
  if (/^(INT|TRUNC|FLOOR|ROUND|ABS)$/i.test(token)) return "font-semibold text-sky-700";
  if (/^(<=|>=|==|!=|[+\-*/%<>=(),])$/.test(token)) return "text-zinc-700";
  return "text-zinc-900";
}

function renderHighlightedMiniScriptLine(line: string, lineIndex: number) {
  if (!line) return <span className="text-transparent">.</span>;

  const tokens = line.match(MSP_TOKEN_PATTERN) ?? [line];

  return tokens.map((token, tokenIndex) => (
    <span
      key={`${lineIndex}-${tokenIndex}-${token}`}
      className={getTokenClass(token)}
    >
      {token}
    </span>
  ));
}

function getLineFromOffset(text: string, offset: number) {
  return text.slice(0, offset).split("\n").length;
}

export default function LiveRoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const { t, locale } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [code, setCode] = useState("");
  const [user, setUser] = useState<any>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [allParticipants, setAllParticipants] = useState<ProfileSummary[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileSummary>>({});
  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [runState, setRunState] = useState<RunState>(EMPTY_RUN_STATE);
  const [program, setProgram] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [waitingInput, setWaitingInput] = useState<string | null>(null);
  const [mousePositions, setMousePositions] = useState<Record<string, CursorPosition>>({});
  const [cursorNow, setCursorNow] = useState(Date.now());
  const [mobileTab, setMobileTab] = useState("code");
  const [rightTab, setRightTab] = useState("console");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isMobileEditor, setIsMobileEditor] = useState<boolean | null>(null);
  const [editorCursorLine, setEditorCursorLine] = useState(1);
  const [tabSize, setTabSize] = useState(2);
  const [cursorDebugEnabled, setCursorDebugEnabled] = useState(false);
  const [cursorDebugInfo, setCursorDebugInfo] = useState<CursorDebugInfo>({
    statusLine: 1,
    supabasePingStatus: "idle",
  });

  const channelRef = useRef<any>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const executionDecorationIdsRef = useRef<string[]>([]);
  const editorCursorDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const mobileTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileHighlightRef = useRef<HTMLDivElement | null>(null);
  const isRemote = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<any>(null);
  const isChatVisibleRef = useRef(false);
  const currentProfileRef = useRef<ProfileSummary | null>(null);
  const isMobileEditorRef = useRef<boolean | null>(null);
  const messageKeysRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isOwner = Boolean(room && user?.id === room.owner_id);
  const isClosed = room?.status === "closed";
  const isChatVisible = mobileTab === "chat" || rightTab === "chat";
  const executionLine =
    program.length > 0 && runState.currentLine > 0
      ? Math.max(1, runState.currentLine)
      : null;
  const mobileEditorLines = useMemo(
    () => (code.length > 0 ? code : 'PRINT "Hello"').split("\n"),
    [code]
  );
  const complexityAnalysis = useMemo<ComplexityAnalysis>(
    () => analyzeMiniScriptComplexity(code, locale),
    [code, locale]
  );

  const tabSizeControl = (
    <Select
      value={String(tabSize)}
      onValueChange={(value) => setTabSize(Number(value))}
    >
      <SelectTrigger
        size="sm"
        className="h-7 border-zinc-200 bg-white px-2 text-xs text-zinc-600"
        aria-label={t("live.tabSize")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {[2, 3, 4, 8].map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size} {t("live.spaces")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  function openProfile(username?: string | null) {
    if (!username) return;
    router.push(`/u/${username}`);
  }

  const scheduleSaveCode = useCallback((value: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      void api.live.saveCode(roomId, value).catch((error) => {
        console.warn("Could not persist live code:", error);
      });
    }, 1000);
  }, [roomId]);

  const syncDesktopCursorLine = useCallback((lineFromEvent?: number) => {
    const editor = editorRef.current;
    const selectionLine = editor?.getSelection()?.positionLineNumber;
    const positionLine = editor?.getPosition()?.lineNumber;
    const lineNumber = lineFromEvent ?? selectionLine ?? positionLine ?? 1;

    setEditorCursorLine((current) =>
      current === lineNumber ? current : lineNumber
    );

    setCursorDebugInfo((current) => ({
      ...current,
      statusLine: lineNumber,
      positionLine,
      selectionLine,
      modelLines: editor?.getModel()?.getLineCount(),
      focused: editor?.hasTextFocus(),
    }));
  }, []);

  const clearEditorCursorListeners = useCallback(() => {
    editorCursorDisposablesRef.current.forEach((disposable) => disposable.dispose());
    editorCursorDisposablesRef.current = [];
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    clearEditorCursorListeners();
    syncDesktopCursorLine();
    editorCursorDisposablesRef.current = [
      editor.onDidChangeCursorPosition((event) => {
        syncDesktopCursorLine(event.position.lineNumber);
      }),
      editor.onDidChangeCursorSelection((event) => {
        syncDesktopCursorLine(event.selection.positionLineNumber);
      }),
      editor.onDidChangeModelContent(() => syncDesktopCursorLine()),
      editor.onKeyUp(() => syncDesktopCursorLine()),
      editor.onMouseDown((event) => {
        syncDesktopCursorLine(event.target.position?.lineNumber);
      }),
      editor.onMouseUp((event) => {
        syncDesktopCursorLine(event.target.position?.lineNumber);
      }),
      editor.onDidFocusEditorText(() => syncDesktopCursorLine()),
    ];

    window.setTimeout(() => {
      editor.layout();
      editor.focus();
      syncDesktopCursorLine();
    }, 0);
  };

  useEffect(() => {
    return clearEditorCursorListeners;
  }, [clearEditorCursorListeners]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const decorations = executionLine
      ? [
          {
            range: {
              startLineNumber: executionLine,
              startColumn: 1,
              endLineNumber: executionLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "msp-current-line",
              glyphMarginClassName: "msp-current-glyph",
            },
          },
        ]
      : [];

    executionDecorationIdsRef.current = editor.deltaDecorations(
      executionDecorationIdsRef.current,
      decorations
    );
  }, [executionLine]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateEditorMode = () => setIsMobileEditor(mediaQuery.matches);

    updateEditorMode();
    mediaQuery.addEventListener("change", updateEditorMode);

    return () => mediaQuery.removeEventListener("change", updateEditorMode);
  }, []);

  useEffect(() => {
    isMobileEditorRef.current = isMobileEditor;

    if (isMobileEditor) {
      setMousePositions({});
    }
  }, [isMobileEditor]);

  useEffect(() => {
    setCursorDebugEnabled(new URLSearchParams(window.location.search).has("cursorDebug"));
  }, []);

  useEffect(() => {
    if (!cursorDebugEnabled || !roomId) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function pingSupabase() {
      setCursorDebugInfo((current) => ({
        ...current,
        supabasePingStatus: "pending",
      }));

      const startedAt = performance.now();

      const { error } = await supabase
        .from("live_rooms")
        .select("id")
        .eq("id", roomId)
        .maybeSingle();

      if (!active) return;

      const latency = Math.round(performance.now() - startedAt);

      setCursorDebugInfo((current) => ({
        ...current,
        supabaseLatencyMs: latency,
        supabasePingStatus: error ? "error" : "ok",
        supabasePingError: error?.message,
      }));

      timeout = setTimeout(pingSupabase, 5000);
    }

    void pingSupabase();

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [cursorDebugEnabled, roomId]);

  useEffect(() => {
    if (isMobileEditor !== false) return;
    if (mobileTab !== "code") return;

    const timeout = window.setTimeout(() => {
      editorRef.current?.layout();
      editorRef.current?.focus();
      syncDesktopCursorLine();
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [isMobileEditor, mobileTab, syncDesktopCursorLine]);

  useEffect(() => {
    if (isMobileEditor !== false) return;

    const interval = window.setInterval(syncDesktopCursorLine, 120);
    return () => window.clearInterval(interval);
  }, [isMobileEditor, syncDesktopCursorLine]);

  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;

    if (isChatVisible) {
      setUnreadMessages(0);
    }
  }, [isChatVisible]);

  const participantProfiles = useMemo<ParticipantProfile[]>(() => {
    const onlineIds = new Set(participants.map((participant) => participant.user_id));

    const online = participants.map((participant) => ({
      id: participant.user_id,
      username: participant.username || profilesMap[participant.user_id]?.username,
      avatar_url: participant.avatar_url || profilesMap[participant.user_id]?.avatar_url,
      online: true,
    }));

    const knownProfiles = allParticipants.length ? allParticipants : Object.values(profilesMap);
    const offline = knownProfiles
      .filter((profile) => !onlineIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        online: false,
      }));

    return [...online, ...offline];
  }, [allParticipants, participants, profilesMap]);

  useEffect(() => {
    let active = true;
    let localChannel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      try {
        setParticipants([]);
        setAllParticipants([]);
        setMousePositions({});
        setUnreadMessages(0);

        const { data } = await api.auth.getSession();
        const currentUser = data.session?.user;

        if (!active) return;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        userRef.current = currentUser;
        setParticipants([
          {
            user_id: currentUser.id,
            username: "User",
            avatar_url: null,
          },
        ]);

        const [roomData, chatData, profileList] = await Promise.all([
          api.live.getRoom(roomId),
          api.live.getMessages(roomId),
          api.live.listProfiles(50),
        ]);

        if (!active) return;

        if (!roomData) {
          router.replace("/livecode");
          return;
        }

        const membership =
          currentUser.id === roomData.owner_id
            ? { status: "owner" }
            : await api.live.getParticipant(roomId, currentUser.id);

        if (!active) return;

        if (currentUser.id !== roomData.owner_id && membership?.status !== "accepted") {
          toast.error(t("live.toast.noAccess"));
          router.replace("/livecode");
          return;
        }

        setRoom(roomData);
        setCode(roomData.code || "");
        messageKeysRef.current = new Set(chatData.map(getMessageKey));
        setMessages(chatData);
        setUsers(profileList);
        setLoading(false);

        const channel = supabase.channel(`room-${roomId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: currentUser.id },
          },
        });

        localChannel = channel;
        channelRef.current = channel;

        channel.on("broadcast", { event: "code-update" }, (payload: any) => {
          if (payload?.payload?.userId === currentUser.id) return;
          const nextCode = payload.payload.code || "";

          isRemote.current = true;
          setCode(nextCode);

          if (currentUser.id === roomData.owner_id) {
            scheduleSaveCode(nextCode);
          }
        });

        channel.on("broadcast", { event: "mouse-move" }, (payload: any) => {
          if (isMobileEditorRef.current !== false) return;

          const { userId, x, y, username, avatar_url } = payload.payload || {};
          if (!userId || userId === currentUser.id) return;

          if (username || avatar_url) {
            setProfilesMap((prev) => ({
              ...prev,
              [userId]: {
                id: userId,
                username: username || prev[userId]?.username || "User",
                avatar_url: avatar_url || prev[userId]?.avatar_url || null,
              },
            }));
          }

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
                username: username || existing?.username || null,
                avatar_url: avatar_url || existing?.avatar_url || null,
              },
            };
          });
        });

        channel.on("broadcast", { event: "chat-message" }, (payload: any) => {
          const incoming = payload.payload as LiveMessage | undefined;
          if (!incoming) return;

          const messageKey = getMessageKey(incoming);

          if (messageKeysRef.current.has(messageKey)) return;

          messageKeysRef.current.add(messageKey);
          setMessages((prev) => [...prev, incoming]);

          if (getMessageUserId(incoming) !== currentUser.id && !isChatVisibleRef.current) {
            setUnreadMessages((count) => count + 1);
          }
        });

        channel.on("broadcast", { event: "participant-online" }, (payload: any) => {
          const incoming = payload.payload as LiveParticipant | undefined;
          if (!incoming?.user_id) return;

          setParticipants((prev) => {
            const existing = prev.find(
              (participant) => participant.user_id === incoming.user_id
            );

            if (existing) {
              return prev.map((participant) =>
                participant.user_id === incoming.user_id
                  ? {
                      ...participant,
                      username: incoming.username || participant.username,
                      avatar_url: incoming.avatar_url || participant.avatar_url,
                    }
                  : participant
              );
            }

            return [...prev, incoming];
          });

          setProfilesMap((prev) => ({
            ...prev,
            [incoming.user_id]: {
              id: incoming.user_id,
              username: incoming.username || prev[incoming.user_id]?.username || "User",
              avatar_url: incoming.avatar_url || prev[incoming.user_id]?.avatar_url || null,
            },
          }));
        });

        channel.on("broadcast", { event: "participant-removed" }, (payload: any) => {
          const removedUserId = payload.payload?.userId as string | undefined;
          if (!removedUserId) return;

          setParticipants((prev) =>
            prev.filter((participant) => participant.user_id !== removedUserId)
          );
          setAllParticipants((prev) =>
            prev.filter((participant) => participant.id !== removedUserId)
          );

          if (removedUserId === currentUser.id) {
            toast.error(t("live.toast.noAccess"));
            router.replace("/livecode");
          }
        });

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_participants",
            filter: `room_id=eq.${roomId}`,
          },
          async (payload: any) => {
            const nextRow = payload.new as RoomParticipant | undefined;
            const previousRow = payload.old as RoomParticipant | undefined;
            const changedUserId = nextRow?.user_id || previousRow?.user_id;

            if (changedUserId === currentUser.id && nextRow?.status === "removed") {
              toast.error(t("live.toast.noAccess"));
              router.replace("/livecode");
              return;
            }

            if (changedUserId) {
              setParticipants((prev) =>
                prev.filter((participant) => participant.user_id !== changedUserId)
              );
            }

            const rows = await api.live.listRoomParticipants(roomId);
            const memberIds = new Set([
              roomData.owner_id,
              ...rows.map((row) => row.user_id),
            ]);
            const profiles = await api.live.listProfilesByIds(Array.from(memberIds));
            if (active) setAllParticipants(profiles);
          }
        );

        channel.on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const raw = Object.values(state).flat();
          const uniqueMap = new Map<string, LiveParticipant>();

          raw.forEach((participant: any) => {
            if (!uniqueMap.has(participant.user_id)) {
              uniqueMap.set(participant.user_id, {
                user_id: participant.user_id,
                username: participant.username,
                avatar_url: participant.avatar_url,
              });
            }
          });

          const profile = currentProfileRef.current;

          if (!uniqueMap.has(currentUser.id)) {
            uniqueMap.set(currentUser.id, {
              user_id: currentUser.id,
              username: profile?.username || "User",
              avatar_url: profile?.avatar_url || null,
            });
          }

          setParticipants((prev) => {
            const next = Array.from(uniqueMap.values());

            if (!next.length && prev.length) {
              return prev;
            }

            return next;
          });
        });

        channel.subscribe(async (status) => {
          if (!active || status !== "SUBSCRIBED") return;

          const profile = await api.profiles.getSummary(currentUser.id);
          if (!active) return;

          currentProfileRef.current = profile;

          setProfilesMap((prev) => ({
            ...prev,
            [currentUser.id]: profile || {
              id: currentUser.id,
              username: "User",
              avatar_url: null,
            },
          }));

          setParticipants((prev) => {
            if (prev.some((participant) => participant.user_id === currentUser.id)) {
              return prev;
            }

            return [
              ...prev,
              {
                user_id: currentUser.id,
                username: profile?.username || "User",
                avatar_url: profile?.avatar_url || null,
              },
            ];
          });

          await channel.track({
            user_id: currentUser.id,
            username: profile?.username || "User",
            avatar_url: profile?.avatar_url || null,
            online_at: new Date().toISOString(),
          });

          void channel.send({
            type: "broadcast",
            event: "participant-online",
            payload: {
              user_id: currentUser.id,
              username: profile?.username || "User",
              avatar_url: profile?.avatar_url || null,
            },
          });

          void api.live.markLiveParticipant(roomId, currentUser.id).catch((error) => {
            console.warn("Could not mark live participant:", error);
          });

          void api.live.joinRoom(roomId, currentUser.id).catch(() => {});
        });
      } catch (error) {
        if (!active) return;

        console.error("Live room init failed:", error);
        toast.error(t("live.toast.error"));
        router.replace("/livecode");
      }
    }

    void init();

    return () => {
      active = false;

      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      if (localChannel) {
        supabase.removeChannel(localChannel);
      }

      if (channelRef.current === localChannel) {
        channelRef.current = null;
      }

      if (userRef.current) {
        void api.live.removeLiveParticipant(roomId, userRef.current.id);
      }
    };
  }, [roomId, router, scheduleSaveCode, t]);

  useEffect(() => {
    async function loadProfiles() {
      const ids = Array.from(
        new Set([
          ...participants.map((participant) => participant.user_id),
          ...messages.map((item) => getMessageUserId(item)).filter(Boolean),
        ])
      );

      if (!ids.length) return;

      const profiles = await api.live.listProfilesByIds(ids);
      const map = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
      setProfilesMap(map);
    }

    void loadProfiles();
  }, [participants, messages]);

  useEffect(() => {
    if (!room) return;

    async function loadAllParticipants() {
      const rows = await api.live.listRoomParticipants(roomId);
      const ids = Array.from(
        new Set(
          [room?.owner_id, ...rows.map((row) => row.user_id)].filter(
            (id): id is string => Boolean(id)
          )
        )
      );
      const profiles = await api.live.listProfilesByIds(ids);
      setAllParticipants(profiles);
    }

    void loadAllParticipants();
  }, [room, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isChatVisible) return;

    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isChatVisible]);

  useEffect(() => {
    let raf: number;

    function animate() {
      setMousePositions((prev) => {
        const next: Record<string, CursorPosition> = {};

        Object.entries(prev).forEach(([id, pos]) => {
          const lerpFactor = 0.25;

          next[id] = {
            ...pos,
            x: pos.x + (pos.targetX - pos.x) * lerpFactor,
            y: pos.y + (pos.targetY - pos.y) * lerpFactor,
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
    const interval = window.setInterval(() => {
      setCursorNow(Date.now());
      setMousePositions((prev) => {
        const now = Date.now();
        const next: Record<string, CursorPosition> = {};

        Object.entries(prev).forEach(([id, data]) => {
          if (now - data.lastSeen < 1500) {
            next[id] = data;
          }
        });

        return next;
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    function handleMove(event: MouseEvent) {
      if (isMobileEditorRef.current !== false) return;
      if (!channelRef.current || !userRef.current) return;

      const payload = {
        userId: userRef.current.id,
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        username: currentProfileRef.current?.username || "User",
        avatar_url: currentProfileRef.current?.avatar_url || null,
      };

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        channelRef.current?.send({
          type: "broadcast",
          event: "mouse-move",
          payload,
        });
      });
    }

    if (isMobileEditor !== false) return;

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isMobileEditor]);

  function applyStepResult(result: StepResult, collectedOutput: string[] = []) {
    if (!result) return;

    setRunState({
      output: collectedOutput,
      variables: result.variables,
      currentLine: result.currentLine,
    });
  }

  function runCode() {
    try {
      const parsed = code.split("\n").map(parseLine);
      setProgram(parsed);
      reset();
      setWaitingInput(null);

      const collectedOutput: string[] = [];
      let lastResult: StepResult = null;

      while (true) {
        const result = step(parsed);
        if (!result) break;

        lastResult = result;

        if (result.inputRequest) {
          setWaitingInput(result.inputRequest);
          break;
        }

        if (result.output !== null) {
          collectedOutput.push(String(result.output));
        }
      }

      applyStepResult(lastResult, collectedOutput);

      if (!lastResult) {
        setRunState({ ...EMPTY_RUN_STATE, output: collectedOutput });
      }

      setMobileTab("run");
      setRightTab("console");
    } catch (error: any) {
      setRunState({
        output: [`Error: ${error.message}`],
        variables: {},
        currentLine: error.line || 0,
      });
      setMobileTab("run");
      setRightTab("console");
    }
  }

  function continueRun() {
    try {
      const collectedOutput: string[] = [];
      let lastResult: StepResult = null;

      while (true) {
        const result = step(program);
        if (!result) break;

        lastResult = result;

        if (result.inputRequest) {
          setWaitingInput(result.inputRequest);
          break;
        }

        if (result.output !== null) {
          collectedOutput.push(String(result.output));
        }
      }

      if (lastResult) {
        setRunState((prev) => ({
          output: [...prev.output, ...collectedOutput],
          variables: lastResult?.variables || prev.variables,
          currentLine: lastResult?.currentLine || prev.currentLine,
        }));
      }
    } catch (error: any) {
      setRunState((prev) => ({
        ...prev,
        output: [`Error: ${error.message}`],
        currentLine: error.line || prev.currentLine,
      }));
    }
  }

  function stepCode() {
    try {
      let parsed = program;

      if (!parsed.length) {
        parsed = code.split("\n").map(parseLine);
        setProgram(parsed);
        reset();
      }

      const result = step(parsed);
      if (!result) return;

      if (result.inputRequest) {
        setWaitingInput(result.inputRequest);
      }

      setRunState((prev) => ({
        output:
          result.output !== null
            ? [...prev.output, String(result.output)]
            : prev.output,
        variables: result.variables,
        currentLine: result.currentLine,
      }));
      setMobileTab("run");
      setRightTab("console");
    } catch (error: any) {
      setRunState((prev) => ({
        ...prev,
        output: [`Error: ${error.message}`],
        currentLine: error.line || prev.currentLine,
      }));
    }
  }

  function submitInput() {
    if (!waitingInput) return;

    const value = Number(inputValue);
    setVariable(waitingInput, Number.isNaN(value) ? inputValue : value);
    advanceLine();

    setInputValue("");
    setWaitingInput(null);
    continueRun();
  }

  function clearOutput() {
    setRunState(EMPTY_RUN_STATE);
    setProgram([]);
    setWaitingInput(null);
    reset();
  }

  function handleChange(value: string) {
    if (!room || isClosed) return;

    setCode(value);

    if (isRemote.current) {
      isRemote.current = false;
      return;
    }

    channelRef.current?.send({
      type: "broadcast",
      event: "code-update",
      payload: { code: value, userId: userRef.current?.id },
    });

    scheduleSaveCode(value);
  }

  function handleMobileCodeScroll(event: UIEvent<HTMLTextAreaElement>) {
    const highlight = mobileHighlightRef.current;
    if (!highlight) return;

    highlight.scrollTop = event.currentTarget.scrollTop;
    highlight.scrollLeft = event.currentTarget.scrollLeft;
  }

  function updateMobileCursorLine(target: HTMLTextAreaElement) {
    setEditorCursorLine(getLineFromOffset(target.value, target.selectionStart));
  }

  function handleMobileCodeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const spaces = " ".repeat(tabSize);
    const nextCode = `${code.slice(0, start)}${spaces}${code.slice(end)}`;

    handleChange(nextCode);
    setEditorCursorLine(getLineFromOffset(nextCode, start + tabSize));

    window.requestAnimationFrame(() => {
      mobileTextAreaRef.current?.focus();
      if (!mobileTextAreaRef.current) return;
      mobileTextAreaRef.current.selectionStart = start + tabSize;
      mobileTextAreaRef.current.selectionEnd = start + tabSize;
    });
  }

  async function sendMessage() {
    if (!message.trim() || !channelRef.current || !userRef.current) return;

    const outgoing: LiveMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: message,
      userId: userRef.current.id,
      createdAt: new Date().toISOString(),
    };

    channelRef.current.send({
      type: "broadcast",
      event: "chat-message",
      payload: outgoing,
    });

    messageKeysRef.current.add(getMessageKey(outgoing));
    setMessages((prev) => [...prev, outgoing]);
    setUnreadMessages(0);
    setMessage("");

    try {
      await api.live.sendMessage(roomId, outgoing.userId || "", outgoing.text);
    } catch {
      toast.error(t("live.toast.error"));
    }
  }

  async function shareSession() {
    const url = `${window.location.origin}/live/${roomId}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("live.shareCopied"));
  }

  async function inviteUser(targetId: string) {
    try {
      const existing = await api.live.getParticipant(roomId, targetId);

      if (existing && existing.status !== "removed") {
        toast.error(
          existing.status === "accepted"
            ? t("live.toast.userInSession")
            : t("live.toast.userInvited")
        );
        return;
      }

      await api.live.inviteUser(roomId, targetId);
      await api.notifications.create({
        userId: targetId,
        actorId: user?.id || null,
        type: "live_invite",
        title: `${currentProfileRef.current?.username || "Someone"} invited you to a live session`,
        body: room?.name || "Open the live coding session.",
        href: `/live/${roomId}`,
        metadata: {
          roomId,
          roomName: room?.name || null,
        },
      });
      const inviteChannel = supabase.channel(`livecode-invites-${targetId}`);
      void inviteChannel
        .httpSend("invite", { roomId })
        .finally(() => {
          void supabase.removeChannel(inviteChannel);
        })
        .catch(() => {});
      toast.success(t("live.toast.inviteSent"));
    } catch {
      toast.error(t("live.toast.inviteFailed"));
    }
  }

  async function removeParticipant(targetId: string) {
    if (!isOwner || targetId === room?.owner_id || targetId === user?.id) return;

    try {
      await api.live.removeRoomParticipant(roomId, targetId);
      setParticipants((prev) =>
        prev.filter((participant) => participant.user_id !== targetId)
      );
      setAllParticipants((prev) =>
        prev.filter((participant) => participant.id !== targetId)
      );

      void channelRef.current?.send({
        type: "broadcast",
        event: "participant-removed",
        payload: { userId: targetId },
      });

      toast.success(t("live.toast.userRemoved"));
    } catch (error) {
      console.error("Remove participant failed:", error);
      toast.error(t("live.toast.removeFailed"));
    }
  }

  async function closeSession() {
    if (!room || !isOwner) return;

    await api.live.closeRoom(roomId);
    setRoom((prev) => (prev ? { ...prev, status: "closed" } : prev));
  }

  const editorPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-zinc-200 bg-white md:border">
      <div className="flex h-10 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
          <span className="ml-2 truncate text-xs font-medium text-zinc-700">main.msp</span>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Play size={13} className="shrink-0 text-zinc-500" />
          <span className="max-w-[7rem] truncate text-xs text-zinc-500 sm:max-w-none">
            {isClosed && isMobileEditor ? t("livecode.status.closed") : isClosed ? t("live.sessionEnded") : "MiniScript+"}
          </span>
          <div className="md:hidden">{tabSizeControl}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isMobileEditor === null && (
          <Skeleton className="h-full min-h-[520px] w-full rounded-none md:min-h-0" />
        )}

        {isMobileEditor === true && (
          <CodeEditorContextMenu
            code={code}
            fileName="main.msp"
            onChange={handleChange}
            onRun={runCode}
            readOnly={isClosed}
          >
            <div className="relative h-full min-h-[520px] overflow-hidden bg-white font-mono text-[15px] leading-6 md:min-h-0">
              <div
                ref={mobileHighlightRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <div className="grid min-h-full min-w-max grid-cols-[3.25rem_1fr]">
                  <div className="select-none border-r border-zinc-100 bg-zinc-50/80 py-4 text-right text-xs leading-6 text-zinc-400">
                    {mobileEditorLines.map((_, index) => (
                      <div key={index} className="h-6 pr-3">
                        {index + 1}
                      </div>
                    ))}
                  </div>

                  <pre className="m-0 min-w-[calc(100vw-5rem)] whitespace-pre px-4 py-4 text-[15px] leading-6">
                    {mobileEditorLines.map((line, index) => (
                      <div
                        key={index}
                        className={`h-6 ${
                          executionLine === index + 1
                            ? "-mx-2 rounded bg-lime-100/70 px-2 ring-1 ring-lime-300/70"
                            : ""
                        }`}
                      >
                        {code.length > 0 ? (
                          renderHighlightedMiniScriptLine(line, index)
                        ) : (
                          <span className="text-zinc-400">{line}</span>
                        )}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              <textarea
                ref={mobileTextAreaRef}
                value={code}
                onChange={(event) => {
                  handleChange(event.target.value);
                  updateMobileCursorLine(event.target);
                }}
                onClick={(event) => updateMobileCursorLine(event.currentTarget)}
                onKeyUp={(event) => updateMobileCursorLine(event.currentTarget)}
                onSelect={(event) => updateMobileCursorLine(event.currentTarget)}
                onScroll={handleMobileCodeScroll}
                onKeyDown={handleMobileCodeKeyDown}
                readOnly={isClosed}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                wrap="off"
                aria-label="MiniScript+ editor"
                className="absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent py-4 pl-[4.25rem] pr-4 font-mono text-[15px] leading-6 text-transparent caret-zinc-900 outline-none selection:bg-emerald-200/70"
              />
            </div>
          </CodeEditorContextMenu>
        )}

        {isMobileEditor === false && (
          <CodeEditorContextMenu
            code={code}
            fileName="main.msp"
            onChange={handleChange}
            onRun={runCode}
            readOnly={isClosed}
          >
            <div className="h-full min-h-0">
              <MiniScriptMonacoEditor
                onMount={handleEditorMount}
                height="100%"
                value={code}
                onChange={(value) => {
                  handleChange(value);
                  syncDesktopCursorLine();
                }}
                readOnly={isClosed}
                options={{
                  contextmenu: false,
                  padding: { top: 16, bottom: 16 },
                  smoothScrolling: true,
                  wordWrap: "on",
                  automaticLayout: true,
                  cursorSmoothCaretAnimation: "on",
                  cursorBlinking: "smooth",
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                  tabSize,
                  insertSpaces: true,
                  wrappingIndent: "same",
                }}
              />
            </div>
          </CodeEditorContextMenu>
        )}
      </div>
    </div>
  );

  const consolePanel = (
    <LiveConsolePanel
      currentLine={runState.currentLine}
      inputPlaceholder={t("live.inputPlaceholder")}
      inputPrompt={t("live.inputPrompt")}
      inputValue={inputValue}
      noOutputLabel={t("live.noOutput")}
      okLabel={t("live.ok")}
      onInputValueChange={setInputValue}
      onSubmitInput={submitInput}
      output={runState.output}
      title={t("live.console")}
      variables={runState.variables}
      waitingInput={waitingInput}
    />
  );

  const debuggerPanel = (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        <DebuggerStateCard
          currentLine={runState.currentLine}
          title={t("live.debugger")}
          variables={runState.variables}
        />

        <ComplexityAnalyzerCard
          analysis={complexityAnalysis}
          compact
          frame="section"
        />
      </div>
    </div>
  );

  const peoplePanel = (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-2">
        {participantProfiles.map((profile) => (
          <div
            key={profile.id}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left"
          >
            <button
              type="button"
              onClick={() => openProfile(profile.username)}
              disabled={!profile.username}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
            >
              <Avatar className="h-8 w-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback>{getInitial(profile)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{profile.username || "User"}</div>
                <div className="text-xs text-zinc-500">
                  {profile.id === room?.owner_id ? t("live.owner") : profile.online ? "Online" : "Offline"}
                </div>
              </div>
            </button>
            <span className={`h-2 w-2 rounded-full ${profile.online ? "bg-emerald-500" : "bg-zinc-300"}`} />
            {isOwner && profile.id !== room?.owner_id && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeParticipant(profile.id)}
                aria-label={t("live.removeParticipant")}
                title={t("live.removeParticipant")}
              >
                <UserMinus size={15} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {messages.map((item) => {
            const messageUserId = getMessageUserId(item);
            const isMe = messageUserId === user?.id;
            const profile =
              participants.find((participant) => participant.user_id === messageUserId) ||
              profilesMap[messageUserId];

            return (
              <div
                key={`${item.id || ""}-${item.created_at || item.createdAt || ""}-${messageUserId}`}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => openProfile(profile?.username)}
                    disabled={!profile?.username}
                    className="rounded-full disabled:cursor-default"
                    aria-label={profile?.username ? `Open ${profile.username}` : "User"}
                  >
                  <Avatar className="h-7 w-7">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback>{getInitial(profile)}</AvatarFallback>
                  </Avatar>
                  </button>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    isMe
                      ? "rounded-br-sm bg-zinc-900 text-white"
                      : "rounded-bl-sm bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => openProfile(profile?.username)}
                      disabled={!profile?.username}
                      className="mb-1 block text-[11px] font-medium opacity-60 hover:underline disabled:cursor-default disabled:hover:no-underline"
                    >
                      {profile?.username || "User"}
                    </button>
                  )}
                  <div className="whitespace-pre-wrap break-words">{item.text}</div>
                  <div className="mt-1 text-right text-[10px] opacity-50">
                    {getMessageTime(item)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!isClosed && (
        <div className="border-t border-zinc-200 bg-white p-3">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("live.messagePlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter") void sendMessage();
              }}
            />
            <Button size="icon" onClick={sendMessage} aria-label={t("live.send")}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const sidePanel = (
    <Tabs value={rightTab} onValueChange={setRightTab} className="flex h-full min-h-0 flex-col gap-0">
      <div className="border-b border-zinc-200 bg-white px-2 py-2">
        <TabsList className="grid h-9 w-full grid-cols-4">
          <TabsTrigger value="console" aria-label={t("live.console")}>
            <Terminal size={15} />
          </TabsTrigger>
          <TabsTrigger value="debugger" aria-label={t("live.debugger")}>
            <CheckCircle2 size={15} />
          </TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            <MessageSquare size={15} />
            {unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="people"><Users size={15} /></TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="console" className="min-h-0">{consolePanel}</TabsContent>
      <TabsContent value="debugger" className="min-h-0">{debuggerPanel}</TabsContent>
      <TabsContent value="chat" className="min-h-0">{chatPanel}</TabsContent>
      <TabsContent value="people" className="min-h-0">{peoplePanel}</TabsContent>
    </Tabs>
  );

  if (loading) {
    return (
      <div className="h-full bg-white">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-[1fr_360px]">
            <Skeleton className="m-4 h-[calc(100%-2rem)]" />
            <Skeleton className="m-4 hidden h-[calc(100%-2rem)] md:block" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="h-full overflow-hidden bg-white">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 md:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/livecode")} aria-label="Back" className="shrink-0">
              <LogOut size={17} />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold md:text-base">
                  {room.name || t("live.untitledSession")}
                </h1>
                <Badge variant={isClosed ? "secondary" : "default"} className="hidden md:inline-flex">
                  {isClosed ? t("livecode.status.closed") : t("livecode.status.active")}
                </Badge>
              </div>
              <div className="hidden text-xs text-zinc-500 md:block">
                {participants.length} {t("live.online")} · {room.id}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="mr-1 hidden -space-x-2 md:flex">
              {participants.slice(0, 4).map((participant) => (
                <button
                  key={participant.user_id}
                  type="button"
                  onClick={() => openProfile(participant.username)}
                  disabled={!participant.username}
                  className="rounded-full transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0"
                  aria-label={participant.username ? `Open ${participant.username}` : "User"}
                >
                <Avatar className="h-7 w-7 border-2 border-white">
                  {participant.avatar_url && <AvatarImage src={participant.avatar_url} />}
                  <AvatarFallback>{getInitial(participant)}</AvatarFallback>
                </Avatar>
                </button>
              ))}
            </div>
            <Button size="sm" onClick={runCode} className="shrink-0 gap-2 px-3">
              <Play size={15} className="shrink-0" />
              {t("live.run")}
            </Button>
            <Button size="sm" variant="secondary" onClick={stepCode} className="hidden gap-2 sm:inline-flex">
              <Plus size={15} />
              {t("live.step")}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearOutput} className="hidden sm:inline-flex">
              {t("live.clear")}
            </Button>
            <Button size="sm" variant="outline" onClick={shareSession} className="hidden gap-2 sm:inline-flex">
              <Share2 size={15} />
              {t("live.share")}
            </Button>
            {isOwner && !isClosed && (
              <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="hidden sm:inline-flex">
                {t("live.invite")}
              </Button>
            )}
            {isOwner && !isClosed && (
              <Button size="sm" variant="destructive" onClick={closeSession} className="hidden sm:inline-flex">
                <Square size={14} />
                {t("live.endSession")}
              </Button>
            )}
          </div>
        </header>

        {isMobileEditor === false && (
          <div className="hidden min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] md:grid">
            <main className="flex min-h-0 min-w-0 flex-col bg-white">
              {editorPanel}
              <div className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
                <span>Ln {editorCursorLine}</span>
                <div className="flex items-center gap-2">
                  <span>{t("live.tabSize")}</span>
                  {tabSizeControl}
                  <span>· MSP</span>
                </div>
              </div>
            </main>
            <aside className="min-h-0 border-l border-zinc-200 bg-white">
              {sidePanel}
            </aside>
          </div>
        )}

        {isMobileEditor === true && (
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex min-h-0 flex-1 flex-col gap-0 md:hidden">
            <TabsContent value="code" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {editorPanel}
            </TabsContent>
            <TabsContent value="run" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {consolePanel}
            </TabsContent>
            <TabsContent value="debugger" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {debuggerPanel}
            </TabsContent>
            <TabsContent value="chat" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {chatPanel}
            </TabsContent>
            <TabsContent value="people" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {peoplePanel}
            </TabsContent>

            <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-lg backdrop-blur">
              <TabsList className="grid h-10 w-full grid-cols-5 bg-zinc-100">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="run">Console</TabsTrigger>
                <TabsTrigger value="debugger">Debug</TabsTrigger>
                <TabsTrigger value="chat" className="relative">
                  Chat
                  {unreadMessages > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="people">People</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        )}

        {isMobileEditor === null && (
          <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-[1fr_360px]">
            <Skeleton className="m-4 h-[calc(100%-2rem)]" />
            <Skeleton className="m-4 hidden h-[calc(100%-2rem)] md:block" />
          </div>
        )}
      </div>

      {isMobileEditor === false && Object.entries(mousePositions).map(([id, pos]) => {
        const userData =
          participants.find((participant) => participant.user_id === id) ||
          profilesMap[id] ||
          {
            username: pos.username,
            avatar_url: pos.avatar_url,
          };
        const opacity = Math.max(0, 1 - (cursorNow - pos.lastSeen) / 1500);

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
            <div className="flex flex-col items-center gap-1">
              <div
                style={{ background: getUserColor(id) }}
                className="h-3.5 w-3.5 rotate-[-45deg] rounded-br-full rounded-tl-full rounded-tr-full shadow"
              />
              {userData?.username && (
                <div
                  style={{ background: getUserColor(id) }}
                  className="rounded px-1.5 py-0.5 text-[10px] text-white shadow"
                >
                  {userData.username}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {cursorDebugEnabled && (
        <div className="fixed bottom-4 left-4 z-[10000] rounded-lg border border-amber-300 bg-amber-50 p-3 font-mono text-[11px] text-amber-950 shadow-xl">
          <div>status: {editorCursorLine}</div>
          <div>sync: {cursorDebugInfo.statusLine}</div>
          <div>pos: {cursorDebugInfo.positionLine ?? "-"}</div>
          <div>sel: {cursorDebugInfo.selectionLine ?? "-"}</div>
          <div>lines: {cursorDebugInfo.modelLines ?? "-"}</div>
          <div>focus: {String(cursorDebugInfo.focused ?? false)}</div>
          <div>
            supabase realtime: {cursorDebugInfo.supabaseLatencyMs ?? "-"}ms
            {" "}
            ({cursorDebugInfo.supabasePingStatus ?? "idle"})
          </div>
          {cursorDebugInfo.supabasePingError && (
            <div className="max-w-48 truncate">
              ping error: {cursorDebugInfo.supabasePingError}
            </div>
          )}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("live.inviteTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("live.searchPlaceholder")}
          />
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {users
              .filter((profile) => profile.id !== user?.id)
              .filter((profile) =>
                profile.username?.toLowerCase().includes(search.toLowerCase())
              )
              .map((profile) => {
                const isAlreadyInSession = participants.some(
                  (participant) => participant.user_id === profile.id
                );

                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                        <AvatarFallback>{getInitial(profile)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{profile.username}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={isAlreadyInSession}
                      onClick={() => inviteUser(profile.id)}
                    >
                      {isAlreadyInSession ? t("live.inSession") : t("live.inviteButton")}
                    </Button>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
