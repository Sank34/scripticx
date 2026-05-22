"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthProfile = {
  id: string;
  role?: string | null;
  banned?: boolean | null;
  [key: string]: unknown;
};

const AUTH_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Auth request timed out"));
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading || !hasLoaded.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS
      );

      const currentUser = data.session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle<AuthProfile>();

      if (profileError) {
        throw profileError;
      }

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

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void load(false);
      }, 0);
    });

    return () => {
      listener.subscription.unsubscribe();
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
