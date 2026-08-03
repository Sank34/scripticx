"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAVIGATION_PROGRESS_EVENT = "scripticx:navigation-progress";

export function startShellRouteProgress() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_EVENT));
}

export function ShellRouteProgress() {
  const pathname = usePathname();
  const firstPathname = useRef(true);
  const currentPageKeyRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const failSafeTimerRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function clearTimers() {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      if (failSafeTimerRef.current) {
        window.clearTimeout(failSafeTimerRef.current);
        failSafeTimerRef.current = null;
      }
    }

    function getPageKey(url = window.location.href) {
      const parsedUrl = new URL(url, window.location.href);
      return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;
    }

    function startProgress() {
      clearTimers();
      setIsVisible(true);
      setProgress(8);

      intervalRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current < 40) return current + 8;
          if (current < 72) return current + 4;
          if (current < 90) return current + 1.5;
          return Math.min(current + 0.4, 94);
        });
      }, 120);

      failSafeTimerRef.current = window.setTimeout(() => {
        setProgress(100);
        hideTimerRef.current = window.setTimeout(() => {
          setIsVisible(false);
          setProgress(0);
        }, 260);
      }, 8000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const samePage =
        nextUrl.origin === currentUrl.origin &&
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search;

      if (nextUrl.origin !== currentUrl.origin || samePage) return;

      startProgress();
    }

    function handlePopState() {
      const nextPageKey = getPageKey();

      if (nextPageKey === currentPageKeyRef.current) {
        return;
      }

      currentPageKeyRef.current = nextPageKey;
      startProgress();
    }

    currentPageKeyRef.current = getPageKey();

    window.addEventListener(NAVIGATION_PROGRESS_EVENT, startProgress);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClick, true);

    return () => {
      clearTimers();
      window.removeEventListener(NAVIGATION_PROGRESS_EVENT, startProgress);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (firstPathname.current) {
      firstPathname.current = false;
      return;
    }

    currentPageKeyRef.current = `${window.location.origin}${window.location.pathname}${window.location.search}`;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (failSafeTimerRef.current) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }

    setProgress(100);
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 280);
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-20 h-[2px] overflow-hidden"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-cyan-400 shadow-[0_0_18px_rgba(16,185,129,0.65)] transition-[width,opacity] duration-300 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          width: `${progress}%`,
        }}
      />
    </div>
  );
}
