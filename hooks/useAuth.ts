"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { api, type ProfileSummary } from "@/lib/api";

const AUTH_TIMEOUT_MS = 6000;

export const authQueryKey = ["auth", "current"] as const;

export type AuthState = {
  profile: ProfileSummary | null;
  user: User | null;
};

export async function fetchAuthState(): Promise<AuthState> {
  const { data } = await api.auth.getSessionWithTimeout(AUTH_TIMEOUT_MS);
  const user = data.session?.user ?? null;

  if (!user) return { profile: null, user: null };

  const profile = await api.profiles.getProfile(user.id);
  return { profile: profile || null, user };
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

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authQueryKey });
  }, [queryClient]);

  return {
    user,
    profile,
    loading: authQuery.isPending,
    error: authQuery.error instanceof Error ? authQuery.error.message : null,
    reload,
    isAdmin: profile?.role === "admin",
    isBanned: profile?.banned === true,
  };
}
