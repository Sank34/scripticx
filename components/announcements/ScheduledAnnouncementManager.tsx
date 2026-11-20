"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AnnouncementDialog } from "@/components/announcements/AnnouncementDialog";
import { useLanguage } from "@/components/LanguageProvider";
import { isAnnouncementUrl, type ScheduledAnnouncement } from "@/lib/scheduled-announcements";
import { supabase } from "@/lib/supabase";

export function ScheduledAnnouncementManager({ userId }: { userId: string }) {
  const { locale } = useLanguage();
  const router = useRouter();
  const client = useQueryClient();
  const active = useRef(true);
  const storageKey = `scripticx:announcement-ack:${userId}`;
  const query = useQuery({
    queryKey: ["scheduled-announcement", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc("next_scheduled_announcement").abortSignal(signal).maybeSingle<ScheduledAnnouncement>();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
    retry: false,
  });

  useEffect(() => {
    active.current = true;
    function sync(event: StorageEvent) {
      if (event.key !== storageKey) return;
      const key = ["scheduled-announcement", userId];
      void client.cancelQueries({ queryKey: key });
      client.setQueryData<ScheduledAnnouncement | null>(key, (value) => value?.id === event.newValue ? null : value);
      void client.invalidateQueries({ queryKey: key });
    }
    window.addEventListener("storage", sync);
    return () => {
      active.current = false;
      window.removeEventListener("storage", sync);
    };
  }, [client, storageKey, userId]);

  const acknowledgment = useMutation({
    mutationFn: async ({ id }: { id: string; href?: string }) => {
      const { error } = await supabase.rpc("acknowledge_scheduled_announcement", { p_announcement_id: id });
      if (error) throw error;
    },
    onSuccess: (_, { id, href }) => {
      const key = ["scheduled-announcement", userId];
      void client.cancelQueries({ queryKey: key });
      client.setQueryData<ScheduledAnnouncement | null>(key, (value) => value?.id === id ? null : value);
      void client.invalidateQueries({ queryKey: key });
      try { window.localStorage.setItem(storageKey, id); } catch { /* Confirmation is already saved. */ }
      if (!active.current || !href || !isAnnouncementUrl(href, true)) return;
      if (href.startsWith("/")) router.push(href);
      else window.location.assign(href);
    },
    onError: () => toast.error(locale === "ro" ? "Confirmarea nu a putut fi salvată. Încearcă din nou." : "Could not save your acknowledgment. Try again."),
  });

  const announcement = query.data;
  if (!announcement || Date.parse(announcement.ends_at) <= Date.now()) return null;
  return <AnnouncementDialog announcement={announcement} pending={acknowledgment.isPending} onAcknowledge={(href) => {
    if (!acknowledgment.isPending) acknowledgment.mutate({ id: announcement.id, href });
  }} />;
}
