"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestSlug } from "@/lib/updates";

const STORAGE_KEY = "scx:lastSeenUpdate";
const EVENT = "scx:updates-seen";

export function useUnreadUpdates() {
  const { data: latestSlug = null } = useQuery({
    queryKey: ["updates", "latest-slug"],
    queryFn: fetchLatestSlug,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    function check() {
      if (!latestSlug) {
        setHasUnread(false);
        return;
      }
      const seen = localStorage.getItem(STORAGE_KEY);
      setHasUnread(seen !== latestSlug);
    }
    check();
    window.addEventListener(EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, [latestSlug]);

  return { hasUnread, latestSlug };
}

export function markUpdatesSeen(slug: string) {
  if (typeof window === "undefined" || !slug) return;
  localStorage.setItem(STORAGE_KEY, slug);
  window.dispatchEvent(new Event(EVENT));
}
