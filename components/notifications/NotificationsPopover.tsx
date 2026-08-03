"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Bell, BellRing, CheckCheck, Inbox } from "lucide-react";

import { api, type AppNotification } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationsPopoverProps = {
  user: SupabaseUser | null;
};

type NotificationsData = {
  items: AppNotification[];
  unreadCount: number;
};

function getNotificationGroupKey(notification: AppNotification) {
  if (notification.type !== "daily_challenge") {
    return notification.id;
  }

  const metadata = notification.metadata || {};
  const challengeId = metadata.challengeId;
  const challengeDate = metadata.challengeDate;
  const problemId = metadata.problemId;

  return [
    "daily_challenge",
    typeof challengeId === "string" ? challengeId : "",
    typeof challengeDate === "string" ? challengeDate : "",
    typeof problemId === "string" ? problemId : notification.href || "",
  ].join(":");
}

function dedupeNotifications(notifications: AppNotification[]) {
  const grouped = new Map<string, AppNotification>();
  const duplicateIds = new Map<string, string[]>();

  notifications.forEach((notification) => {
    const key = getNotificationGroupKey(notification);
    const existing = grouped.get(key);

    duplicateIds.set(key, [...(duplicateIds.get(key) || []), notification.id]);

    if (!existing) {
      grouped.set(key, notification);
      return;
    }

    const shouldPreferCurrent =
      new Date(notification.created_at).getTime() >
      new Date(existing.created_at).getTime();
    const nextNotification = shouldPreferCurrent ? notification : existing;
    const hasUnreadDuplicate = !existing.read_at || !notification.read_at;

    grouped.set(key, {
      ...nextNotification,
      read_at: hasUnreadDuplicate ? null : nextNotification.read_at,
    });
  });

  return {
    duplicateIds,
    notifications: Array.from(grouped.values()),
  };
}

function getStringMetadata(
  metadata: AppNotification["metadata"],
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function stripNotificationPrefix(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/^(Solve|Rezolvă|Rezolva):\s*/i, "");
}

function getLocalizedNotification(
  notification: AppNotification,
  locale: string
) {
  const ro = locale === "ro";
  const username =
    getStringMetadata(notification.metadata, "username") ||
    notification.actor?.username ||
    (ro ? "Cineva" : "Someone");

  if (notification.type === "daily_challenge") {
    const problemTitle = stripNotificationPrefix(notification.body);

    return {
      title: ro
        ? "Challenge-ul zilei este disponibil"
        : "Today's challenge is ready",
      body: problemTitle
        ? ro
          ? `Rezolvă: ${problemTitle}`
          : `Solve: ${problemTitle}`
        : notification.body,
    };
  }

  if (notification.type === "live_invite") {
    const roomName =
      getStringMetadata(notification.metadata, "roomName") ||
      notification.body ||
      (ro ? "sesiunea live" : "the live session");

    return {
      title: ro
        ? `${username} te-a invitat la o sesiune live`
        : `${username} invited you to a live session`,
      body: roomName,
    };
  }

  if (notification.type === "post_like") {
    return {
      title: ro
        ? `${username} ți-a apreciat postarea`
        : `${username} liked your post`,
      body:
        notification.body ||
        (ro ? "Deschide postarea în ScripticX." : "Open your post on ScripticX."),
    };
  }

  if (notification.type === "post_comment") {
    return {
      title: ro
        ? `${username} a comentat la postarea ta`
        : `${username} commented on your post`,
      body: notification.body,
    };
  }

  if (notification.type === "post_mention") {
    return {
      title: ro
        ? `${username} te-a menționat într-o postare`
        : `${username} mentioned you in a post`,
      body:
        notification.body ||
        (ro ? "Deschide postarea în ScripticX." : "Open the post on ScripticX."),
    };
  }

  if (notification.type === "follow") {
    return {
      title: ro
        ? `${username} a început să te urmărească`
        : `${username} started following you`,
      body: ro
        ? "Deschide profilul său în ScripticX."
        : "Open their profile from ScripticX.",
    };
  }

  if (notification.type === "new_assignment") {
    const className =
      getStringMetadata(notification.metadata, "className") ||
      (ro ? "clasa ta" : "your class");

    return {
      title: ro
        ? `Temă nouă în ${className}`
        : `New assignment in ${className}`,
      body: notification.body,
    };
  }

  return {
    title: notification.title,
    body: notification.body,
  };
}

function formatNotificationTime(value: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

  return formatter.format(new Date(value));
}

function getBrowserPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

function notifyBrowser(notification: Pick<AppNotification, "body" | "id" | "title">) {
  if (getBrowserPermission() !== "granted") return false;

  try {
    new window.Notification(notification.title, {
      body: notification.body || undefined,
      badge: "/icons/notification-icon-72.png",
      icon: "/icons/notification-icon-512.png",
      tag: notification.id,
    });

    return true;
  } catch (error) {
    console.warn("Browser notification failed:", error);
    return false;
  }
}

function playNotificationSound() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);

    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.warn("Notification sound failed:", error);
  }
}

export function NotificationsPopover({ user }: NotificationsPopoverProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(getBrowserPermission);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const browserNotifiedIds = useRef<Set<string>>(new Set());
  const initializedNotifications = useRef(false);

  const queryKey = useMemo(() => ["notifications", user?.id], [user?.id]);

  const { data, isLoading } = useQuery<NotificationsData>({
    queryKey,
    enabled: Boolean(user?.id),
    refetchInterval: browserPermission === "granted" ? 15_000 : false,
    queryFn: async () => {
      if (!user) return { items: [], unreadCount: 0 };

      const [items, unreadCount] = await Promise.all([
        api.notifications.list(user.id),
        api.notifications.unreadCount(user.id),
      ]);

      return { items, unreadCount };
    },
  });

  const rawNotifications = useMemo(() => data?.items || [], [data?.items]);
  const {
    duplicateIds: notificationDuplicateIds,
    notifications,
  } = useMemo(
    () => dedupeNotifications(rawNotifications),
    [rawNotifications]
  );
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey });

          if (payload.eventType !== "INSERT") return;

          const notification = payload.new as AppNotification;
          if (browserNotifiedIds.current.has(notification.id)) return;
          const content = getLocalizedNotification(notification, locale);

          if (notifyBrowser({ ...notification, ...content })) {
            browserNotifiedIds.current.add(notification.id);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [locale, queryClient, queryKey, user?.id]);

  useEffect(() => {
    knownNotificationIds.current = new Set();
    browserNotifiedIds.current = new Set();
    initializedNotifications.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    api.dailyChallenges
      .ensureTodayNotification(user.id, locale)
      .then((challenge) => {
        if (!cancelled && challenge) {
          void queryClient.invalidateQueries({ queryKey });
        }
      })
      .catch((error) => {
        console.warn("Could not ensure daily challenge notification.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, queryClient, queryKey, user?.id]);

  useEffect(() => {
    if (!notifications.length) {
      initializedNotifications.current = true;
      return;
    }

    const currentIds = new Set(
      notifications.map((notification) => notification.id)
    );

    if (!initializedNotifications.current) {
      knownNotificationIds.current = currentIds;
      initializedNotifications.current = true;
      return;
    }

    const newUnreadNotifications = notifications.filter(
      (notification) =>
        !notification.read_at &&
        !knownNotificationIds.current.has(notification.id)
    );

    knownNotificationIds.current = currentIds;

    newUnreadNotifications.forEach((notification) => {
      if (browserNotifiedIds.current.has(notification.id)) return;
      const content = getLocalizedNotification(notification, locale);

      if (notifyBrowser({ ...notification, ...content })) {
        browserNotifiedIds.current.add(notification.id);
        playNotificationSound();
      }
    });
  }, [locale, notifications]);

  async function requestBrowserNotifications() {
    if (!("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === "granted") {
      const didShow = notifyBrowser({
        id: "scripticx-browser-notifications-enabled",
        title: t("notifications.browserEnabledTitle"),
        body: t("notifications.browserEnabledBody"),
      });

      if (!didShow) {
        toast.error(t("notifications.browserBlocked"));
      }
    }
  }

  async function markAsRead(notification: AppNotification) {
    if (!user?.id || notification.read_at) return;

    const duplicateIds =
      notificationDuplicateIds.get(getNotificationGroupKey(notification)) || [
        notification.id,
      ];

    await Promise.all(
      duplicateIds.map((notificationId) =>
        api.notifications.markAsRead(notificationId, user.id)
      )
    );
    await queryClient.invalidateQueries({ queryKey });
  }

  async function openNotification(notification: AppNotification) {
    await markAsRead(notification);

    if (notification.href) {
      setOpen(false);
      router.push(notification.href);
    }
  }

  async function markAllAsRead() {
    if (!user?.id || !unreadCount) return;

    await api.notifications.markAllAsRead(user.id);
    await queryClient.invalidateQueries({ queryKey });
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
          aria-label={t("notifications.open")}
        >
          {unreadCount ? <BellRing size={18} /> : <Bell size={18} />}

          {unreadCount ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={isMobile ? "center" : "end"}
        sideOffset={12}
        collisionPadding={isMobile ? 20 : 8}
        className="w-[calc(100vw-3rem)] max-w-[23rem] gap-0 overflow-hidden rounded-2xl p-0 sm:w-96 sm:max-w-none"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">{t("notifications.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount
                ? t("notifications.unread").replace("{count}", String(unreadCount))
                : t("notifications.allCaughtUp")}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={!unreadCount}
            onClick={markAllAsRead}
            className="h-8 gap-1 rounded-xl px-2 text-xs"
          >
            <CheckCheck size={14} />
            {t("notifications.markAllRead")}
          </Button>
        </div>

        {browserPermission === "default" ? (
          <div className="border-b bg-zinc-50 px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={requestBrowserNotifications}
              className="h-8 w-full rounded-xl text-xs"
            >
              {t("notifications.enableBrowser")}
            </Button>
          </div>
        ) : null}

        <ScrollArea className="h-[min(28rem,calc(100vh-12rem))]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-zinc-100" />
                    <div className="h-3 w-1/2 rounded bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length ? (
            <div className="divide-y">
              {notifications.map((notification) => {
                const unread = !notification.read_at;
                const content = getLocalizedNotification(notification, locale);

                return (
                  <button
                    key={notification.id}
                    onClick={() => void openNotification(notification)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-zinc-50",
                      unread && "bg-red-50/40"
                    )}
                  >
                    <UserAvatar
                      avatarUrl={notification.actor?.avatar_url}
                      username={notification.actor?.username || "S"}
                      className="h-9 w-9"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                          {content.title}
                        </p>

                        {unread ? (
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                        ) : null}
                      </div>

                      {content.body ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {content.body}
                        </p>
                      ) : null}

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at, locale)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                <Inbox size={18} className="text-zinc-500" />
              </div>
              <p className="text-sm font-medium">{t("notifications.empty")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("notifications.emptyHint")}
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
