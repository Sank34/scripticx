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

type Conflict = {
  localCode: string;
  remote: DraftRow;
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
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);
  const lastSavedCodeRef = useRef("");
  const serverUpdatedAtRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const key = userId && problemId ? `${userId}:${scopeKey}:${problemId}` : null;

  useEffect(() => {
    if (!key || !userId || fallbackCode === null || hydratedKeyRef.current === key) return;
    let active = true;
    void fetchDraft(userId, problemId, scopeKey)
      .then((remote) => {
        if (!active) return;
        const initialCode = remote?.code ?? fallbackCode;
        hydratedKeyRef.current = key;
        lastSavedCodeRef.current = initialCode;
        serverUpdatedAtRef.current = remote?.updated_at ?? null;
        onHydrate(initialCode);
        setState("synced");
      })
      .catch(() => {
        if (!active) return;
        hydratedKeyRef.current = key;
        lastSavedCodeRef.current = fallbackCode;
        onHydrate(fallbackCode);
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [fallbackCode, key, onHydrate, problemId, scopeKey, userId]);

  useEffect(() => {
    if (!key || !userId || hydratedKeyRef.current !== key || code === lastSavedCodeRef.current) return;
    const revision = ++revisionRef.current;
    setState("saving");
    const timeout = window.setTimeout(() => {
      void saveDraft({
        baseUpdatedAt: serverUpdatedAtRef.current,
        code,
        problemId,
        scopeKey,
        userId,
      }).then((result) => {
        if (revisionRef.current !== revision) return;
        if (result.conflict) {
          setConflict({ localCode: code, remote: result.conflict });
          setState("conflict");
          return;
        }
        lastSavedCodeRef.current = result.row.code;
        serverUpdatedAtRef.current = result.row.updated_at;
        setConflict(null);
        setState("synced");
      }).catch(() => {
        if (revisionRef.current === revision) setState("error");
      });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [code, key, problemId, scopeKey, userId]);

  const resolveConflict = useCallback(async (resolution: "cloud" | "local") => {
    if (!conflict || !userId) return;
    setState("saving");
    if (resolution === "cloud") {
      serverUpdatedAtRef.current = conflict.remote.updated_at;
      lastSavedCodeRef.current = conflict.remote.code;
      onHydrate(conflict.remote.code);
      setConflict(null);
      setState("synced");
      return;
    }
    const result = await supabase
      .from("problem_editor_drafts")
      .update({ code: conflict.localCode })
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("scope_key", scopeKey)
      .eq("updated_at", conflict.remote.updated_at)
      .select("*")
      .maybeSingle<DraftRow>();
    if (result.error || !result.data) {
      setState("conflict");
      throw result.error || new Error("The draft changed again.");
    }
    serverUpdatedAtRef.current = result.data.updated_at;
    lastSavedCodeRef.current = result.data.code;
    setConflict(null);
    setState("synced");
  }, [conflict, onHydrate, problemId, scopeKey, userId]);

  return { conflict: Boolean(conflict), resolveConflict, state };
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
    if (inserted.error) throw inserted.error;
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
