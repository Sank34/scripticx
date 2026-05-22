"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3,
            gcTime: 1000 * 60 * 30,
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      })
  );
  const lastResumeAt = useRef(0);

  useEffect(() => {
    async function resumeSupabaseAndQueries() {
      const now = Date.now();
      if (now - lastResumeAt.current < 10_000) return;

      lastResumeAt.current = now;

      const { data } = await supabase.auth.getSession();
      const expiresAt = data.session?.expires_at
        ? data.session.expires_at * 1000
        : null;

      if (expiresAt && expiresAt - now < 1000 * 60 * 2) {
        await supabase.auth.refreshSession();
      }

      await queryClient.refetchQueries({
        type: "active",
        stale: true,
      });
    }

    function handleResume() {
      if (document.visibilityState === "visible") {
        void resumeSupabaseAndQueries();
      }
    }

    window.addEventListener("focus", handleResume);
    window.addEventListener("online", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("online", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
