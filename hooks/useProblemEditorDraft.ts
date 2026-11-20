"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

export type WebProblemDraftState = "conflict" | "error" | "saving" | "synced";

type DraftRow = {
  code: string;
  problem_id: string;
  scope_key: string;
  updated_at: string;
  user_id: string;
};

type DraftSession = {
  key: string;
  savedCode: string;
  updatedAt: string | null;
  pending: Promise<void> | null;
  blocked: boolean;
};

export function useProblemEditorDraft({
  code,
  fallbackCode,
  onHydrate,
  problemId,
  scopeKey,
  userId,
}: {
  code: string;
  fallbackCode: string | null;
  onHydrate: (code: string) => void;
  problemId: string;
  scopeKey: string;
  userId: string | null;
}) {
  const [state, setState] = useState<WebProblemDraftState>("synced");
  const [conflict, setConflict] = useState<DraftRow | null>(null);
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const currentDraft = useRef<DraftSession | null>(null);
  const resolvingConflict = useRef(false);
  const key = userId && problemId ? `${userId}:${scopeKey}:${problemId}` : null;
  const ready = draft !== null && draft.key === key;

  useEffect(() => () => {
    currentDraft.current = null;
  }, [key]);

  useEffect(() => {
    if (!key || !userId || fallbackCode === null || currentDraft.current?.key === key) return;
    let active = true;
    const hydrate = (remote: DraftRow | null, status: WebProblemDraftState) => {
      if (!active) return;
      const initialCode = remote?.code ?? fallbackCode;
      const session: DraftSession = {
        key,
        savedCode: initialCode,
        updatedAt: remote?.updated_at ?? null,
        pending: null,
        blocked: false,
      };
      currentDraft.current = session;
      onHydrate(initialCode);
      setDraft(session);
      setConflict(null);
      setState(status);
    };
    void fetchDraft(userId, problemId, scopeKey)
      .then((remote) => hydrate(remote, "synced"))
      .catch(() => hydrate(null, "error"));
    return () => {
      active = false;
    };
  }, [fallbackCode, key, onHydrate, problemId, scopeKey, userId]);

  useEffect(() => {
    if (!draft || !ready || !userId || conflict) return;
    if (code === draft.savedCode && !draft.pending) {
      setState((previous) => previous === "saving" ? "synced" : previous);
      return;
    }
    let active = true;
    setState("saving");
    const timeout = window.setTimeout(async () => {
      await draft.pending;
      if (!active || currentDraft.current !== draft || draft.blocked) return;
      if (code === draft.savedCode) {
        setState("synced");
        return;
      }
      draft.pending = saveDraft({
        baseUpdatedAt: draft.updatedAt,
        code,
        problemId,
        scopeKey,
        userId,
      }).then((result) => {
        if (currentDraft.current !== draft) return;
        if (result.conflict) {
          draft.blocked = true;
          setConflict(result.conflict);
          setState("conflict");
          return;
        }
        draft.savedCode = result.row.code;
        draft.updatedAt = result.row.updated_at;
        if (active) setState("synced");
      }).catch(() => {
        if (active && currentDraft.current === draft) setState("error");
      }).finally(() => {
        draft.pending = null;
      });
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [code, conflict, draft, problemId, ready, scopeKey, userId]);

  const resolveConflict = useCallback(async (resolution: "cloud" | "local") => {
    if (!conflict || !userId || !draft || !ready || resolvingConflict.current) return;
    if (resolution === "cloud") {
      draft.updatedAt = conflict.updated_at;
      draft.savedCode = conflict.code;
      draft.blocked = false;
      onHydrate(conflict.code);
      setConflict(null);
      setState("synced");
      return;
    }
    resolvingConflict.current = true;
    setState("saving");
    try {
      const result = await saveDraft({ baseUpdatedAt: conflict.updated_at, code, problemId, scopeKey, userId });
      if (currentDraft.current !== draft) return;
      if (result.conflict) {
        setConflict(result.conflict);
        throw new Error("The draft changed again.");
      }
      draft.updatedAt = result.row.updated_at;
      draft.savedCode = result.row.code;
      draft.blocked = false;
      setConflict(null);
      setState("synced");
    } catch (error) {
      if (currentDraft.current === draft) setState("conflict");
      throw error;
    } finally {
      resolvingConflict.current = false;
    }
  }, [code, conflict, draft, onHydrate, problemId, ready, scopeKey, userId]);

  return { ready, conflict: ready && Boolean(conflict), resolveConflict, state };
}

async function saveDraft(input: {
  baseUpdatedAt: string | null;
  code: string;
  problemId: string;
  scopeKey: string;
  userId: string;
}): Promise<{ conflict?: DraftRow; row: DraftRow }> {
  if (!input.baseUpdatedAt) {
    const existing = await fetchDraft(input.userId, input.problemId, input.scopeKey);
    if (existing) {
      if (existing.code === input.code) return { row: existing };
      return { conflict: existing, row: existing };
    }
    const inserted = await supabase
      .from("problem_editor_drafts")
      .insert({
        code: input.code,
        problem_id: input.problemId,
        scope_key: input.scopeKey,
        user_id: input.userId,
      })
      .select("*")
      .single<DraftRow>();
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const remote = await fetchDraft(input.userId, input.problemId, input.scopeKey);
        if (remote) return remote.code === input.code ? { row: remote } : { conflict: remote, row: remote };
      }
      throw inserted.error;
    }
    return { row: inserted.data };
  }

  const updated = await supabase
    .from("problem_editor_drafts")
    .update({ code: input.code })
    .eq("user_id", input.userId)
    .eq("problem_id", input.problemId)
    .eq("scope_key", input.scopeKey)
    .eq("updated_at", input.baseUpdatedAt)
    .select("*")
    .maybeSingle<DraftRow>();
  if (updated.error) throw updated.error;
  if (updated.data) return { row: updated.data };
  const remote = await fetchDraft(input.userId, input.problemId, input.scopeKey);
  if (!remote) throw new Error("The cloud draft no longer exists.");
  if (remote.code === input.code) return { row: remote };
  return { conflict: remote, row: remote };
}

async function fetchDraft(userId: string, problemId: string, scopeKey: string) {
  const result = await supabase
    .from("problem_editor_drafts")
    .select("*")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .eq("scope_key", scopeKey)
    .maybeSingle<DraftRow>();
  if (result.error) throw result.error;
  return result.data;
}
