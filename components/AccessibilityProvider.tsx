"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "scripticx-accessibility-mode";
const CHANGE_EVENT = "scripticx:accessibility-mode-changed";

type AccessibilityContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function applyAccessibilityMode(enabled: boolean) {
  document.documentElement.classList.toggle("accessibility-mode", enabled);
  document.documentElement.setAttribute("data-accessibility-mode", enabled ? "high-contrast" : "default");
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) === "true";
    setEnabledState(stored);
    applyAccessibilityMode(stored);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === "true";
      setEnabledState(next);
      applyAccessibilityMode(next);
    };
    const onChange = () => {
      const next = window.localStorage.getItem(STORAGE_KEY) === "true";
      setEnabledState(next);
      applyAccessibilityMode(next);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  const value = useMemo<AccessibilityContextValue>(() => ({
    enabled,
    setEnabled: (next) => {
      setEnabledState(next);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      applyAccessibilityMode(next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
  }), [enabled]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilityMode() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibilityMode must be used within AccessibilityProvider");
  return context;
}
