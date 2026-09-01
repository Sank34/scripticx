"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";

import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type LiveChatMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const QUICK_REACTIONS = ["👍", "❤️", "🎉"] as const;

export function LiveRoomChat({
  disabled = false,
  locale,
  roomId,
  userId,
}: {
  disabled?: boolean;
  locale: "en" | "ro";
  roomId: string;
  userId: string;
}) {
  const ro = locale === "ro";
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.live.getChat(roomId);
      setMessages(next);
      setError(null);
    } catch (loadError) {
      console.warn("Could not load live chat:", loadError);
      setError(ro ? "Chatul nu a putut fi încărcat." : "Could not load chat.");
    } finally {
      setLoading(false);
    }
  }, [roomId, ro]);

  useEffect(() => {
    setLoading(true);
    void load();
    const channel = supabase
      .channel(`live-chat:${roomId}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_messages", filter: `room_id=eq.${roomId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_message_reactions", filter: `room_id=eq.${roomId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, roomId, userId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ behavior: "smooth", top: viewport.scrollHeight });
  }, [messages]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    setDraft("");
    try {
      await api.live.sendMessage(roomId, userId, text);
      await load();
    } catch (sendError) {
      console.warn("Could not send live message:", sendError);
      setDraft(text);
      setError(ro ? "Mesajul nu a putut fi trimis." : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    try {
      await api.live.toggleMessageReaction({ emoji, messageId, roomId, userId });
      await load();
    } catch (reactionError) {
      console.warn("Could not update live reaction:", reactionError);
      setError(ro ? "Reacția nu a putut fi actualizată." : "Could not update reaction.");
    }
  }

  return (
    <div className="mt-2.5 overflow-hidden rounded-md border bg-background">
      <div className="flex h-8 items-center justify-between border-b px-2.5">
        <span className="text-[10px] font-semibold">{ro ? "Chat live" : "Live chat"}</span>
        <span className="text-[9px] text-muted-foreground">
          {messages.length} {ro ? "mesaje" : "messages"}
        </span>
      </div>
      <div ref={viewportRef} className="max-h-56 min-h-28 space-y-2 overflow-y-auto p-2.5">
        {loading ? (
          <div className="grid min-h-24 place-items-center"><LoaderCircle className="size-4 animate-spin text-muted-foreground" /></div>
        ) : messages.length ? (
          messages.map((message) => (
            <LiveMessageRow
              key={message.id}
              message={message}
              onReact={(emoji) => message.id && void toggleReaction(message.id, emoji)}
              userId={userId}
            />
          ))
        ) : (
          <p className="py-8 text-center text-[10px] leading-relaxed text-muted-foreground">
            {ro ? "Începe conversația cu participanții conectați." : "Start the conversation with connected participants."}
          </p>
        )}
      </div>
      {error ? <p className="border-t px-2.5 py-1.5 text-[9px] text-destructive">{error}</p> : null}
      <div className="flex gap-1.5 border-t p-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          disabled={disabled || sending}
          maxLength={1200}
          placeholder={disabled
            ? (ro ? "Sesiunea s-a încheiat" : "Session ended")
            : (ro ? "Scrie un mesaj…" : "Type a message…")}
          className="h-8 min-w-0 flex-1 px-2.5 text-xs"
        />
        <Button
          type="button"
          size="icon-sm"
          onClick={() => void sendMessage()}
          disabled={disabled || sending || !draft.trim()}
          aria-label={ro ? "Trimite" : "Send"}
        >
          {sending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function LiveMessageRow({
  message,
  onReact,
  userId,
}: {
  message: LiveChatMessage;
  onReact: (emoji: string) => void;
  userId: string;
}) {
  const groups = useMemo(() => QUICK_REACTIONS.map((emoji) => {
    const reactions = message.reactions.filter((reaction) => reaction.emoji === emoji);
    return {
      count: reactions.length,
      emoji,
      selected: reactions.some((reaction) => reaction.user_id === userId),
    };
  }), [message.reactions, userId]);
  const username = message.profile?.username || "ScripticX user";
  const createdAt = message.created_at ?? message.createdAt;

  return (
    <div className="group flex items-start gap-2">
      <UserAvatar
        avatarUrl={message.profile?.avatar_url}
        equippedRewards={message.profile?.equipped_rewards}
        username={username}
        className="mt-0.5 size-6"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[10px] font-semibold">{username}</span>
          {createdAt ? (
            <span className="shrink-0 text-[8px] text-muted-foreground">
              {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed">{message.text}</p>
        <div className="mt-1 flex flex-wrap gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          {groups.map((reaction) => (
            <button
              type="button"
              key={reaction.emoji}
              onClick={() => onReact(reaction.emoji)}
              className={`rounded-full border px-1.5 py-0.5 text-[9px] transition-colors ${
                reaction.selected ? "border-emerald-500/40 bg-emerald-500/10" : "border-transparent hover:border-border hover:bg-muted"
              }`}
              aria-pressed={reaction.selected}
            >
              {reaction.emoji}{reaction.count ? ` ${reaction.count}` : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
