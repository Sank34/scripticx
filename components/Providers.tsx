"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import {
  authQueryKey,
  type AuthState,
} from "@/hooks/useAuth";

const realtimeScopesByTable: Record<string, string[]> = {
  live_rooms: ["livecode", "command-menu", "groups"],
  room_participants: ["livecode"],
  live_participants: ["livecode"],
  live_messages: ["livecode"],
  profiles: [
    "auth",
    "admin",
    "profile",
    "feed",
    "leaderboard",
    "community",
    "search",
    "classes",
    "post",
    "command-menu",
  ],
  posts: ["feed", "post", "profile", "community"],
  comments: ["feed", "post", "profile", "community"],
  post_likes: ["feed", "post", "profile", "community"],
  follows: ["profile", "feed", "community", "search"],
  snippets: ["editor-snippets", "profile", "community"],
  submissions: ["dashboard", "profile", "leaderboard", "problems", "roadmap"],
  problems: ["problems", "admin", "classes", "dashboard", "daily-challenge"],
  classes: ["classes", "admin", "dashboard"],
  class_members: ["classes", "admin", "dashboard"],
  assignments: ["classes", "dashboard", "notifications"],
  assignment_submissions: ["classes", "dashboard"],
  assignment_problem_submissions: ["classes", "dashboard"],
  user_achievements: ["profile", "admin", "community"],
  achievements: ["profile", "admin", "community"],
  updates: ["updates", "dashboard", "admin"],
  contact_messages: ["contact_messages", "admin"],
  notifications: ["notifications"],
  study_groups: ["groups", "community", "command-menu"],
  study_group_members: ["groups", "community"],
  study_group_channels: ["groups"],
  study_group_messages: ["groups"],
  daily_challenges: ["daily-challenge", "problems", "dashboard", "admin"],
  daily_challenge_completions: [
    "daily-challenge-completions",
    "daily-challenge",
    "problems",
    "dashboard",
  ],
  reward_products: ["rewards-shop", "admin", "profile"],
  user_reward_inventory: ["rewards-shop", "profile", "auth"],
  reward_transactions: ["rewards-shop", "profile", "admin"],
  learning_paths: ["roadmap", "admin"],
  learning_units: ["roadmap", "admin"],
  lessons: ["roadmap", "admin"],
  lesson_progress: ["roadmap", "dashboard", "profile"],
  competitions: ["competitions", "admin"],
  competition_breaks: ["competitions", "admin"],
  competition_problems: ["competitions", "admin"],
  competition_participants: ["competitions", "admin"],
  competition_submissions: ["competitions", "admin"],
  platform_settings: ["platform-status", "admin"],
};

function PlatformAccessSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function synchronize() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        await fetch("/api/auth/access", { method: "DELETE" });
        return;
      }

      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!active || !response.ok) return;

      const status = (await response.json()) as {
        lockdownEnabled?: boolean;
        role?: string;
      };
      if (
        status.lockdownEnabled &&
        status.role !== "admin" &&
        pathname !== "/lockdown"
      ) {
        router.replace(`/lockdown?next=${encodeURIComponent(pathname)}`);
      }
    }

    void synchronize();
    const interval = window.setInterval(synchronize, 4 * 60 * 1000);
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void synchronize(), 0);
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      data.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}

function AuthCacheSync({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    const subscription = api.auth.onAuthStateChange((session) => {
      const user = session?.user ?? null;

      if (!user) {
        queryClient.setQueryData<AuthState>(authQueryKey, {
          profile: null,
          user: null,
        });
        return;
      }

      const current = queryClient.getQueryData<AuthState>(authQueryKey);
      queryClient.setQueryData<AuthState>(authQueryKey, {
        profile: current?.user?.id === user.id ? current.profile : null,
        user,
      });

      window.setTimeout(async () => {
        const profile = await api.profiles.getProfile(user.id);
        queryClient.setQueryData<AuthState>(authQueryKey, {
          profile: profile || null,
          user,
        });
      }, 0);
    });

    function refreshProfile() {
      void queryClient.invalidateQueries({ queryKey: authQueryKey });
    }

    window.addEventListener("profile-updated", refreshProfile);
    window.addEventListener("rewards-updated", refreshProfile);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", refreshProfile);
      window.removeEventListener("rewards-updated", refreshProfile);
    };
  }, [queryClient]);

  return null;
}

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
            refetchOnMount: true,
            retry: 2,
          },
        },
      })
  );
  const lastResumeAt = useRef(0);

  useEffect(() => {
    let invalidationTimeout: number | null = null;
    const pendingScopes = new Set<string>();

    function invalidateRealtimeQueries(scopes: string[]) {
      scopes.forEach((scope) => pendingScopes.add(scope));
      if (invalidationTimeout) return;

      invalidationTimeout = window.setTimeout(() => {
        invalidationTimeout = null;
        const invalidatedScopes = new Set(pendingScopes);
        pendingScopes.clear();

        void queryClient.invalidateQueries({
          predicate: (query) => {
            const scope = query.queryKey[0];
            return typeof scope === "string" && invalidatedScopes.has(scope);
          },
        });
      }, 250);
    }

    const channel = supabase.channel("global-realtime-invalidations");

    Object.entries(realtimeScopesByTable).forEach(([table, scopes]) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          if (table !== "profiles") {
            invalidateRealtimeQueries(scopes);
            return;
          }

          const changedId =
            (payload.new as Record<string, unknown> | null)?.id ??
            (payload.old as Record<string, unknown> | null)?.id;
          const currentUserId = queryClient.getQueryData<AuthState>(authQueryKey)
            ?.user?.id;
          invalidateRealtimeQueries(
            changedId && changedId !== currentUserId
              ? scopes.filter((scope) => scope !== "auth")
              : scopes
          );
        }
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
      <AuthCacheSync queryClient={queryClient} />
      <PlatformAccessSync />
      {children}
    </QueryClientProvider>
  );
}
