"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const realtimeInvalidationTargets = [
  "admin",
  "livecode",
  "command-menu",
  "dashboard",
  "profile",
  "feed",
  "leaderboard",
  "problems",
  "classes",
  "updates",
  "community",
  "contact_messages",
  "editor-snippets",
  "notifications",
  "groups",
  "daily-challenge",
  "daily-challenge-completions",
];

const realtimeTables = [
  "live_rooms",
  "room_participants",
  "live_participants",
  "live_messages",
  "profiles",
  "posts",
  "comments",
  "post_likes",
  "follows",
  "snippets",
  "submissions",
  "problems",
  "classes",
  "class_members",
  "assignments",
  "assignment_submissions",
  "assignment_problem_submissions",
  "user_achievements",
  "updates",
  "contact_messages",
  "notifications",
  "study_groups",
  "study_group_members",
  "study_group_channels",
  "study_group_messages",
  "daily_challenges",
  "daily_challenge_completions",
];

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
            refetchOnReconnect: "always",
            refetchOnWindowFocus: "always",
            refetchOnMount: "always",
            retry: 2,
          },
        },
      })
  );
  const lastResumeAt = useRef(0);

  useEffect(() => {
    let invalidationTimeout: number | null = null;

    function invalidateRealtimeQueries() {
      if (invalidationTimeout) return;

      invalidationTimeout = window.setTimeout(() => {
        invalidationTimeout = null;

        void queryClient.invalidateQueries({
          predicate: (query) => {
            const scope = query.queryKey[0];
            return (
              typeof scope === "string" &&
              realtimeInvalidationTargets.includes(scope)
            );
          },
        });
      }, 250);
    }

    const channel = supabase.channel("global-realtime-invalidations");

    realtimeTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        invalidateRealtimeQueries
      );
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        void queryClient.refetchQueries({ type: "active" });
      }
    });

    return () => {
      if (invalidationTimeout) window.clearTimeout(invalidationTimeout);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

      supabase.realtime.connect();

      await queryClient.refetchQueries({
        type: "active",
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
