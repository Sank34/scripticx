"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    setProfile(profileData || null);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isBanned: profile?.banned === true,
  };
}