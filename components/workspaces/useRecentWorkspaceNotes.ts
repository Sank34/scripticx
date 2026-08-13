"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listNotes,
  subscribeWorkspaceStorage,
  type WorkspaceNote,
} from "@/lib/workspace-storage";

export function useRecentWorkspaceNotes(
  userId: string | null | undefined,
  limit = 5
) {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);

  const refresh = useCallback(() => {
    if (!userId) {
      setNotes([]);
      return;
    }

    setNotes(listNotes(userId).slice(0, limit));
  }, [limit, userId]);

  useEffect(() => {
    refresh();
    if (!userId) return;
    return subscribeWorkspaceStorage(userId, refresh);
  }, [refresh, userId]);

  return notes;
}

export function formatWorkspaceNoteTime(value: string, locale: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000)
  );
  const ro = locale === "ro";

  if (elapsedMinutes < 1) return ro ? "acum" : "now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} h`;
  if (elapsedHours < 48) return ro ? "ieri" : "yesterday";

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} d`;

  return new Intl.DateTimeFormat(ro ? "ro-RO" : "en", {
    day: "numeric",
    month: "short",
  }).format(timestamp);
}
