"use client";

import { useEffect, useRef, useState } from "react";
import { readEditorSessionDraft, writeEditorSessionDraft, type EditorSessionDraft } from "@/lib/editor-session-draft";

export function useEditorSessionDraft({ userId, draft, onRestore, skipRestore, enabled }: {
  userId: string | null;
  draft: EditorSessionDraft;
  onRestore: (draft: EditorSessionDraft) => void;
  skipRestore: boolean;
  enabled: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const restore = useRef(onRestore);
  const skip = useRef(skipRestore);
  const latest = useRef(draft);
  useEffect(() => { restore.current = onRestore; }, [onRestore]);

  useEffect(() => {
    if (!userId) return;
    const cached = skip.current ? null : readEditorSessionDraft(userId);
    if (cached) restore.current(cached);
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !enabled || !userId) return;
    latest.current = draft;
    const timeout = window.setTimeout(() => writeEditorSessionDraft(userId, draft), 300);
    return () => window.clearTimeout(timeout);
  }, [draft, enabled, hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !enabled || !userId) return;
    const flush = () => writeEditorSessionDraft(userId, latest.current);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled, hydrated, userId]);

  return hydrated;
}
