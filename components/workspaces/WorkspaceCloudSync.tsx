"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { syncWorkspaceImagesForNotes } from "@/lib/workspace-assets";
import {
  ensureStudentWorkspace,
  pushWorkspaceLocalChange,
  synchronizeStudentWorkspace,
} from "@/lib/workspace-cloud";
import { subscribeWorkspaceStorage } from "@/lib/workspace-storage";

const RETRY_DELAY_MS = 1_200;

export function WorkspaceCloudSync() {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const retryTimerRef = useRef<number | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const reportFailure = (error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      if (message === lastErrorRef.current) return;
      lastErrorRef.current = message;
      console.error("Workspace cloud synchronization failed:", error);
      toast.warning(
        locale === "ro"
          ? "Modificările sunt păstrate local și vor fi sincronizate automat."
          : "Changes are cached locally and will sync automatically.",
        { description: message, id: `workspace-cloud-sync:${userId}` }
      );
    };

    const sync = () => {
      void synchronizeStudentWorkspace(userId)
        .then((result) => {
          lastErrorRef.current = null;
          toast.dismiss(`workspace-cloud-sync:${userId}`);
          void syncWorkspaceImagesForNotes(userId, result.notes).catch(reportFailure);
        })
        .catch(reportFailure);
    };

    const scheduleSync = () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(sync, RETRY_DELAY_MS);
    };

    const unsubscribeStorage = subscribeWorkspaceStorage(userId, (detail) => {
      void pushWorkspaceLocalChange(userId, detail).catch((error) => {
        reportFailure(error);
        scheduleSync();
      });
    });

    const onOnline = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);

    void ensureStudentWorkspace(userId)
      .then((workspaceId) => {
        if (!active) return;
        channel = supabase
          .channel(`student-workspace:${workspaceId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workspace_notes",
              filter: `workspace_id=eq.${workspaceId}`,
            },
            scheduleSync
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workspace_whiteboards",
              filter: `workspace_id=eq.${workspaceId}`,
            },
            scheduleSync
          )
          .subscribe();
        sync();
      })
      .catch(reportFailure);

    return () => {
      active = false;
      unsubscribeStorage();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [locale, user?.id]);

  return null;
}
