import type { Session } from "@supabase/supabase-js";

import type { ProfileSummary } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  getSupabaseSessionWithTimeout,
  updateSupabaseSessionSnapshot,
} from "@/lib/supabase-session";

export async function getSessionWithTimeout(timeoutMs: number) {
  return getSupabaseSessionWithTimeout(timeoutMs);
}

export async function getProfile(id: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProfileSummary>();

  if (error) throw error;
  return data || null;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    updateSupabaseSessionSnapshot(session);
    callback(session);
  });

  return subscription;
}
