"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ProfileSummary } from "@/lib/api";
import { getProfile, getSessionWithTimeout } from "@/lib/auth-client";

const AUTH_TIMEOUT_MS = 6000;

export const authQueryKey = ["auth", "current"] as const;

export type AuthState = {
  profile: ProfileSummary | null;
  profileResolved: boolean;
  user: User | null;
};

export async function fetchAuthState(): Promise<AuthState> {
  const { data } = await getSessionWithTimeout(AUTH_TIMEOUT_MS);
  const user = data.session?.user ?? null;

  if (!user) return { profile: null, profileResolved: true, user: null };

  const profile = await getProfile(user.id);
  return { profile: profile || null, profileResolved: true, user };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const authQuery = useQuery<AuthState>({
    queryKey: authQueryKey,
    queryFn: fetchAuthState,
    staleTime: 1000 * 60 * 5,
  });
  const user = authQuery.data?.user ?? null;
  const profile = authQuery.data?.profile ?? null;
  const profileResolved = authQuery.data?.profileResolved === true;

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authQueryKey });
  }, [queryClient]);

  return {
    user,
    profile,
    loading: authQuery.isPending || Boolean(user && !profileResolved),
    profileResolved,
    error: authQuery.error instanceof Error ? authQuery.error.message : null,
    reload,
    isAdmin: profile?.role === "admin",
    isBanned: profile?.banned === true,
  };
}
