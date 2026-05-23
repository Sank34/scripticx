"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { api, type ProfileSummary } from "@/lib/api";

const AUTH_TIMEOUT_MS = 6000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading || !hasLoaded.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data } = await api.auth.getSessionWithTimeout(AUTH_TIMEOUT_MS);

      const currentUser = data.session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      const profileData = await api.profiles.getProfile(currentUser.id);
      setProfile(profileData || null);
    } catch (err) {
      console.error("Auth load failed:", err);
      setUser(null);
      setProfile(null);
      setError(err instanceof Error ? err.message : "Auth load failed");
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);

    const subscription = api.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void load(false);
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [load]);

  return {
    user,
    profile,
    loading,
    error,
    reload: load,
    isAdmin: profile?.role === "admin",
    isBanned: profile?.banned === true,
  };
}
