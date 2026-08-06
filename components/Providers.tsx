"use client";

import {
  QueryClient,
} from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  removeOldestQuery,
  type PersistedClient,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

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

const PERSISTED_QUERY_SCOPES = new Set([
  "community",
  "dashboard",
  "feed",
  "leaderboard",
  "post",
  "problems",
  "profile",
  "rewards-shop",
  "roadmap",
  "search",
  "update",
  "updates",
]);

const QUERY_CACHE_KEY = "scripticx-query-cache-v2";
const QUERY_CACHE_OWNER_KEY = "scripticx-query-cache-owner-v1";
const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 12;

function synchronizeQueryCacheOwner(
  queryClient: QueryClient,
  nextUserId: string | null
) {
  const previousUserId = window.localStorage.getItem(QUERY_CACHE_OWNER_KEY);
  const changedUser = Boolean(
    previousUserId && previousUserId !== nextUserId
  );

  if (changedUser) {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
  }

  if (nextUserId) {
    window.localStorage.setItem(QUERY_CACHE_OWNER_KEY, nextUserId);
  } else {
    window.localStorage.removeItem(QUERY_CACHE_OWNER_KEY);
  }
}

function serializeQueryCache(value: PersistedClient): string {
  return JSON.stringify(value, (_key, current) => {
    if (current instanceof Set) {
      return { __scripticxCacheType: "Set", values: Array.from(current) };
    }
    if (current instanceof Map) {
      return { __scripticxCacheType: "Map", values: Array.from(current.entries()) };
    }
    return current;
  });
}

function deserializeQueryCache(value: string): PersistedClient {
  return JSON.parse(value, (_key, current) => {
    if (
      current &&
      typeof current === "object" &&
      current.__scripticxCacheType === "Set" &&
      Array.isArray(current.values)
    ) {
      return new Set(current.values);
    }
    if (
      current &&
      typeof current === "object" &&
      current.__scripticxCacheType === "Map" &&
      Array.isArray(current.values)
    ) {
      return new Map(current.values);
    }
    return current;
  }) as PersistedClient;
}

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

      synchronizeQueryCacheOwner(queryClient, user?.id || null);

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
            gcTime: QUERY_CACHE_MAX_AGE,
            networkMode: "offlineFirst",
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            retry: 2,
          },
        },
      })
  );
  const [queryPersister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      key: QUERY_CACHE_KEY,
      throttleTime: 1_000,
      serialize: serializeQueryCache,
      deserialize: deserializeQueryCache,
      retry: removeOldestQuery,
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: "scripticx-query-cache-v2",
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) => {
            const scope = query.queryKey[0];
            const keyParts = query.queryKey.filter(
              (part): part is string => typeof part === "string"
            );
            return (
              query.state.status === "success" &&
              typeof scope === "string" &&
              PERSISTED_QUERY_SCOPES.has(scope) &&
              !keyParts.includes("role") &&
              !keyParts.includes("config-raw")
            );
          },
        },
      }}
    >
      <AuthCacheSync queryClient={queryClient} />
      <PlatformAccessSync />
      {children}
    </PersistQueryClientProvider>
  );
}
