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
import { getProfile, onAuthStateChange } from "@/lib/auth-client";
import {
  authQueryKey,
  type AuthState,
} from "@/hooks/useAuth";
import { createQueryCacheStorage } from "@/lib/queryCacheStorage";
import { getSupabaseSessionWithTimeout } from "@/lib/supabase-session";
import { NETWORK_RECOVERED_EVENT } from "@/lib/network-recovery";

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
    "teacher-workspace",
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
  classes: ["classes", "admin", "dashboard", "teacher-workspace"],
  class_members: ["classes", "admin", "dashboard", "teacher-workspace"],
  assignments: [
    "classes",
    "dashboard",
    "notifications",
    "teacher-workspace",
  ],
  assignment_submissions: ["classes", "dashboard", "teacher-workspace"],
  assignment_problem_submissions: [
    "classes",
    "dashboard",
    "teacher-workspace",
  ],
  workspace_calendar_events: ["student-planner"],
  workspace_projects: ["student-planner"],
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
  user_learning_path_enrollments: ["roadmap", "dashboard", "profile"],
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

function getRealtimeScopes(pathname: string) {
  const scopes = new Set<string>();

  if (pathname.startsWith("/admin")) scopes.add("admin");
  if (pathname.startsWith("/dashboard")) scopes.add("dashboard");
  if (pathname.startsWith("/feed")) scopes.add("feed");
  if (pathname.startsWith("/post")) scopes.add("post");
  if (pathname.startsWith("/profile") || pathname.startsWith("/u/")) {
    scopes.add("profile");
  }
  if (pathname.startsWith("/leaderboard")) scopes.add("leaderboard");
  if (pathname.startsWith("/problems")) {
    scopes.add("problems");
    scopes.add("daily-challenge");
  }
  if (pathname.startsWith("/groups")) scopes.add("groups");
  if (pathname.startsWith("/classes")) scopes.add("classes");
  if (pathname.startsWith("/workspace/teacher")) {
    scopes.add("teacher-workspace");
  }
  if (pathname.startsWith("/workspace/student/calendar")) {
    scopes.add("student-planner");
  }
  if (pathname.startsWith("/learn")) scopes.add("roadmap");
  if (pathname.startsWith("/shop")) scopes.add("rewards-shop");
  if (pathname.startsWith("/competitions")) scopes.add("competitions");
  if (pathname.startsWith("/updates")) scopes.add("updates");
  if (pathname.startsWith("/search")) scopes.add("search");
  if (pathname.startsWith("/editor")) {
    scopes.add("editor-snippets");
    scopes.add("livecode");
  }
  if (pathname.startsWith("/live") || pathname.startsWith("/editor/live")) {
    scopes.add("livecode");
  }

  return scopes;
}

function synchronizeQueryCacheOwner(
  queryClient: QueryClient,
  nextUserId: string | null,
  queryCacheStorage: ReturnType<typeof createQueryCacheStorage>
) {
  const previousUserId = window.localStorage.getItem(QUERY_CACHE_OWNER_KEY);
  const changedUser = Boolean(
    previousUserId && previousUserId !== nextUserId
  );

  if (changedUser) {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
    void queryCacheStorage?.removeItem(QUERY_CACHE_KEY);
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
  const pathnameRef = useRef(pathname);
  const lastStatusRef = useRef<{
    lockdownEnabled: boolean;
    role?: string;
  } | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    const status = lastStatusRef.current;
    if (
      status?.lockdownEnabled &&
      status.role !== "admin" &&
      pathname !== "/lockdown"
    ) {
      router.replace(`/lockdown?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    let active = true;
    let lastSyncAt = 0;
    let synchronizedToken: string | null = null;
    let inFlight: Promise<void> | null = null;

    async function synchronize(force = false) {
      if (inFlight) return inFlight;

      inFlight = (async () => {
        let data: Awaited<ReturnType<typeof getSupabaseSessionWithTimeout>>["data"];
        try {
          ({ data } = await getSupabaseSessionWithTimeout(6_000));
        } catch {
          return;
        }
        const token = data.session?.access_token || null;
        const now = Date.now();

        if (
          !force &&
          token === synchronizedToken &&
          now - lastSyncAt < 3.5 * 60 * 1000
        ) {
          return;
        }

        if (!token) {
          const [statusResponse] = await Promise.all([
            fetch("/api/platform/status"),
            synchronizedToken !== null || lastSyncAt === 0
              ? fetch("/api/auth/access", { method: "DELETE" })
              : Promise.resolve(null),
          ]);
          synchronizedToken = null;
          lastSyncAt = now;
          if (statusResponse.ok) {
            const status = (await statusResponse.json()) as {
              lockdownEnabled?: boolean;
            };
            lastStatusRef.current = {
              lockdownEnabled: status.lockdownEnabled === true,
            };
            const currentPathname = pathnameRef.current;
            if (status.lockdownEnabled && currentPathname !== "/lockdown") {
              router.replace(
                `/lockdown?next=${encodeURIComponent(currentPathname)}`
              );
            }
          } else {
            lastStatusRef.current = null;
          }
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
        synchronizedToken = token;
        lastSyncAt = now;
        lastStatusRef.current = {
          lockdownEnabled: status.lockdownEnabled === true,
          role: status.role,
        };

        const currentPathname = pathnameRef.current;
        if (
          status.lockdownEnabled &&
          status.role !== "admin" &&
          currentPathname !== "/lockdown"
        ) {
          router.replace(
            `/lockdown?next=${encodeURIComponent(currentPathname)}`
          );
        }
      })().finally(() => {
        inFlight = null;
      });

      return inFlight;
    }

    void synchronize();
    const interval = window.setInterval(
      () => void synchronize(true),
      4 * 60 * 1000
    );
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void synchronize(true), 0);
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      data.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

function AuthCacheSync({
  queryClient,
  queryCacheStorage,
}: {
  queryClient: QueryClient;
  queryCacheStorage: ReturnType<typeof createQueryCacheStorage>;
}) {
  useEffect(() => {
    const subscription = onAuthStateChange((session) => {
      const user = session?.user ?? null;

      synchronizeQueryCacheOwner(
        queryClient,
        user?.id || null,
        queryCacheStorage
      );

      if (!user) {
        queryClient.setQueryData<AuthState>(authQueryKey, {
          profile: null,
          profileResolved: true,
          user: null,
        });
        return;
      }

      const current = queryClient.getQueryData<AuthState>(authQueryKey);
      queryClient.setQueryData<AuthState>(authQueryKey, {
        profile: current?.user?.id === user.id ? current.profile : null,
        profileResolved:
          current?.user?.id === user.id
            ? current.profileResolved
            : false,
        user,
      });

      window.setTimeout(async () => {
        try {
          const profile = await getProfile(user.id);
          if (
            queryClient.getQueryData<AuthState>(authQueryKey)?.user?.id !==
            user.id
          ) {
            return;
          }
          queryClient.setQueryData<AuthState>(authQueryKey, {
            profile: profile || null,
            profileResolved: true,
            user,
          });
        } catch {
          if (
            queryClient.getQueryData<AuthState>(authQueryKey)?.user?.id !==
            user.id
          ) {
            return;
          }
          // A failed profile request must finish the resolving phase so route
          // guards can make a deterministic decision instead of hanging.
          queryClient.setQueryData<AuthState>(authQueryKey, {
            profile: null,
            profileResolved: true,
            user,
          });
        }
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
  }, [queryCacheStorage, queryClient]);

  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3,
            gcTime: QUERY_CACHE_MAX_AGE,
            networkMode: "offlineFirst",
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: 2,
          },
        },
      })
  );
  const [queryCacheStorage] = useState(createQueryCacheStorage);
  const [queryPersister] = useState(() =>
    createAsyncStoragePersister({
      storage: queryCacheStorage,
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

    const activeScopes = getRealtimeScopes(pathname);
    if (!activeScopes.size) return;

    const channel = supabase.channel(
      `route-invalidations:${(
        pathname.replace(/[^a-z0-9]+/gi, "-") || "home"
      ).slice(0, 72)}`
    );

    Object.entries(realtimeScopesByTable).forEach(([table, scopes]) => {
      if (!scopes.some((scope) => activeScopes.has(scope))) return;

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
  }, [pathname, queryClient]);

  useEffect(() => {
    async function resumeSupabaseAndQueries(force = false) {
      const now = Date.now();
      if (!force && now - lastResumeAt.current < 10_000) return;

      lastResumeAt.current = now;

      try {
        // getSession performs Supabase's own recovery/refresh when necessary.
        // Calling refreshSession separately here creates a competing auth lock.
        await getSupabaseSessionWithTimeout(6_000);
        supabase.realtime.connect();
      } catch {
        // A delayed auth refresh must not prevent the rest of the application
        // from recovering its active queries.
      }

      try {
        await queryClient.resumePausedMutations();
      } catch {
        // A failed queued write keeps its own mutation error state. Continue by
        // refreshing readable data so the shell can still recover.
      }

      try {
        await queryClient.refetchQueries({
          type: "active",
          ...(force ? {} : { stale: true }),
        });
      } catch {
        // Query-level errors remain visible to their owning screens and can be
        // retried again by the recovery scheduler.
      }
    }

    function handleResume() {
      if (document.visibilityState === "visible") {
        void resumeSupabaseAndQueries();
      }
    }

    function handleConfirmedNetworkRecovery() {
      void resumeSupabaseAndQueries(true);
    }

    window.addEventListener("focus", handleResume);
    window.addEventListener("online", handleResume);
    window.addEventListener(
      NETWORK_RECOVERED_EVENT,
      handleConfirmedNetworkRecovery
    );
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("online", handleResume);
      window.removeEventListener(
        NETWORK_RECOVERED_EVENT,
        handleConfirmedNetworkRecovery
      );
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
      <AuthCacheSync
        queryClient={queryClient}
        queryCacheStorage={queryCacheStorage}
      />
      <PlatformAccessSync />
      {children}
    </PersistQueryClientProvider>
  );
}
