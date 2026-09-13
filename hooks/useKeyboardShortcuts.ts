"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { matchesShortcut, normalizeShortcuts, shortcutStorageKey, type ShortcutBindings, type ShortcutId } from "@/lib/keyboard-shortcuts";

const changedEvent = "scripticx:shortcuts-changed";
export const openCommandMenuEvent = "scripticx:open-command-menu";

export function useKeyboardShortcuts() {
  const { user } = useAuth();
  const key = shortcutStorageKey(user?.id);
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === key) notify(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(changedEvent, notify);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(changedEvent, notify);
    };
  }, [key]);
  const getSnapshot = useCallback(() => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const bindings = useMemo(() => {
    try { return normalizeShortcuts(raw ? JSON.parse(raw) : null); } catch { return normalizeShortcuts(null); }
  }, [raw]);
  const save = useCallback((next: ShortcutBindings) => {
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(changedEvent));
  }, [key]);
  return { bindings, save };
}

export function useShortcut(id: ShortcutId, action: () => void, enabled = true, allowInEditor = false) {
  const { bindings } = useKeyboardShortcuts();
  const binding = bindings[id];
  useEffect(() => {
    if (!enabled || !binding) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !matchesShortcut(event, binding)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-shortcut-recorder]")) return;
      if (id !== "search" && document.querySelector('[role="dialog"], [role="alertdialog"], [data-slot="context-menu-content"]')) return;
      const editable = target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor');
      if (id !== "search" && editable && !(allowInEditor && target?.closest('[data-code-shortcuts], .monaco-editor'))) return;
      event.preventDefault();
      event.stopPropagation();
      action();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [action, allowInEditor, binding, enabled, id]);
}
