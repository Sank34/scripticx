"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

function hasNetworkErrorMessage(reason: unknown) {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";

  return /failed to fetch|networkerror|load failed|fetch/i.test(message);
}

async function canReachNetwork() {
  if (!navigator.onLine) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(
      `/icons/notification-icon-72.png?ts=${Date.now()}`,
      {
      cache: "no-store",
      signal: controller.signal,
      }
    );

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function NetworkStatus() {
  const { t } = useLanguage();
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [suspectedOffline, setSuspectedOffline] = useState(false);
  const [retryIn, setRetryIn] = useState(5);
  const hasNetwork = isOnline && !suspectedOffline;

  useEffect(() => {
    if (hasNetwork) return;

    const interval = window.setInterval(() => {
      setRetryIn((value) => (value <= 1 ? 5 : value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [hasNetwork]);

  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (hasNetworkErrorMessage(event.reason)) {
        setSuspectedOffline(true);
        event.preventDefault();
      }
    }

    function handleError(event: ErrorEvent) {
      if (hasNetworkErrorMessage(event.error || event.message)) {
        setSuspectedOffline(true);
        event.preventDefault();
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (!suspectedOffline && isOnline) return;

    let cancelled = false;

    async function checkConnection() {
      const reachable = await canReachNetwork();
      if (!cancelled) {
        setSuspectedOffline(!reachable);
      }
    }

    void checkConnection();
    const interval = window.setInterval(() => {
      void checkConnection();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isOnline, suspectedOffline]);

  useEffect(() => {
    let cancelled = false;

    async function checkConnection() {
      if (document.visibilityState !== "visible") return;

      const reachable = await canReachNetwork();
      if (!cancelled) {
        setSuspectedOffline(!reachable);
      }
    }

    const interval = window.setInterval(() => {
      void checkConnection();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (hasNetwork) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-2xl shadow-amber-950/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <WifiOff className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <p className="font-semibold">{t("network.offlineTitle")}</p>
          <p className="text-xs text-amber-800">
            {t("network.reconnecting").replace("{seconds}", String(retryIn))}
          </p>
        </div>
      </div>
    </div>
  );
}
