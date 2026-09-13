"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { onlineManager } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  NETWORK_RECOVERED_EVENT,
  getNetworkRetryDelay,
} from "@/lib/network-recovery";

const ONLINE_NOTICE_DURATION_MS = 3_600;
const NOTICE_EXIT_DURATION_MS = 280;

type NetworkNoticeMode = "hidden" | "offline" | "online";

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
  const timeout = window.setTimeout(() => controller.abort(), 3_500);

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
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryIn, setRetryIn] = useState(5);
  const [isChecking, setIsChecking] = useState(false);
  const [noticeMode, setNoticeMode] = useState<NetworkNoticeMode>("hidden");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const networkAvailableRef = useRef(true);
  const connectionCheckRef = useRef<Promise<boolean> | null>(null);
  const wasOfflineRef = useRef(false);
  const hasNetwork = isOnline && !suspectedOffline;
  const retryDelay = getNetworkRetryDelay(retryAttempt);

  const markUnavailable = useCallback(() => {
    if (networkAvailableRef.current) {
      setRetryAttempt(0);
    }
    networkAvailableRef.current = false;
    onlineManager.setOnline(false);
    setSuspectedOffline(true);
  }, []);

  const checkConnection = useCallback(() => {
    if (connectionCheckRef.current) return connectionCheckRef.current;

    setIsChecking(true);
    const check = canReachNetwork()
      .then((reachable) => {
        const available = navigator.onLine && reachable;
        const recovered = available && !networkAvailableRef.current;

        networkAvailableRef.current = available;
        onlineManager.setOnline(available);
        setSuspectedOffline(!available);

        if (available) {
          setRetryAttempt(0);
          if (recovered) {
            window.dispatchEvent(new Event(NETWORK_RECOVERED_EVENT));
          }
        }

        return available;
      })
      .finally(() => {
        connectionCheckRef.current = null;
        setIsChecking(false);
      });

    connectionCheckRef.current = check;
    return check;
  }, []);

  useEffect(() => {
    if (!isOnline) {
      markUnavailable();
      return;
    }

    if (!networkAvailableRef.current) {
      void checkConnection();
    }
  }, [checkConnection, isOnline, markUnavailable]);

  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (hasNetworkErrorMessage(event.reason)) {
        markUnavailable();
        event.preventDefault();
      }
    }

    function handleError(event: ErrorEvent) {
      if (hasNetworkErrorMessage(event.error || event.message)) {
        markUnavailable();
        event.preventDefault();
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, [markUnavailable]);

  useEffect(() => {
    if (hasNetwork) return;

    const deadline = Date.now() + retryDelay;
    const updateCountdown = () => {
      setRetryIn(Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)));
    };

    updateCountdown();
    const countdown = window.setInterval(updateCountdown, 1_000);
    const retry = window.setTimeout(() => {
      void checkConnection().then((available) => {
        if (!available) {
          setRetryAttempt((attempt) => attempt + 1);
        }
      });
    }, retryDelay);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(retry);
    };
  }, [checkConnection, hasNetwork, retryAttempt, retryDelay]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        networkAvailableRef.current
      ) {
        void checkConnection();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [checkConnection]);

  useEffect(() => {
    let entryFrame: number | null = null;
    let dismissTimeout: number | null = null;
    let removeTimeout: number | null = null;

    if (!hasNetwork) {
      wasOfflineRef.current = true;
      setNoticeMode("offline");
      entryFrame = window.requestAnimationFrame(() => {
        setNoticeVisible(true);
      });
    } else if (wasOfflineRef.current) {
      setNoticeMode("online");
      setNoticeVisible(true);
      dismissTimeout = window.setTimeout(() => {
        setNoticeVisible(false);
        removeTimeout = window.setTimeout(() => {
          wasOfflineRef.current = false;
          setNoticeMode("hidden");
        }, NOTICE_EXIT_DURATION_MS);
      }, ONLINE_NOTICE_DURATION_MS);
    }

    return () => {
      if (entryFrame !== null) window.cancelAnimationFrame(entryFrame);
      if (dismissTimeout !== null) window.clearTimeout(dismissTimeout);
      if (removeTimeout !== null) window.clearTimeout(removeTimeout);
    };
  }, [hasNetwork]);

  if (noticeMode === "hidden") return null;

  const retryProgress = Math.max(
    0,
    Math.min(100, (retryIn * 1_000 * 100) / retryDelay)
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-3 sm:bottom-5 sm:px-5">
      <section
        aria-atomic="true"
        aria-live="polite"
        className={`sx-overlay w-full max-w-sm overflow-hidden rounded-[var(--sx-radius-card)] border bg-popover text-popover-foreground transition-transform duration-[var(--sx-motion-slow)] ease-[var(--sx-ease-emphasized)] motion-reduce:transition-none ${
          noticeVisible
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none translate-y-[calc(100%+2rem)]"
        }`}
        role="status"
        style={
          noticeMode === "online"
            ? {
                borderColor:
                  "color-mix(in oklab, var(--sx-success) 30%, var(--border))",
              }
            : { borderColor: "var(--border)" }
        }
      >
        <div
          key={noticeMode}
          className="flex items-center gap-3 p-3.5 motion-safe:animate-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--sx-radius-control)] bg-muted text-muted-foreground"
            style={
              noticeMode === "online"
                ? {
                    background: "var(--sx-success-soft)",
                    color: "var(--sx-success)",
                  }
                : undefined
            }
          >
            {noticeMode === "online" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <WifiOff className="size-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5">
              {noticeMode === "online"
                ? t("network.onlineTitle")
                : t("network.offlineTitle")}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {noticeMode === "online"
                ? t("network.onlineBody")
                : isChecking
                  ? t("network.checking")
                  : t("network.reconnecting").replace(
                      "{seconds}",
                      String(retryIn)
                    )}
            </p>
          </div>

          {noticeMode === "offline" && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 shrink-0 px-3"
              disabled={isChecking}
              onClick={() => void checkConnection()}
              aria-label={
                isChecking ? t("network.checking") : t("network.retryNow")
              }
            >
              <RefreshCw
                className={
                  isChecking ? "animate-spin motion-reduce:animate-none" : ""
                }
              />
              <span className="hidden sm:inline">
                {isChecking ? t("network.checking") : t("network.retryNow")}
              </span>
            </Button>
          )}
        </div>

        {noticeMode === "offline" && (
          <div className="h-1 bg-muted" aria-hidden="true">
            <div
              className="h-full bg-foreground/55 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${retryProgress}%` }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
