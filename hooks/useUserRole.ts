"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserRole(user: any) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchRole() {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("ROLE ERROR:", error);
        setRole("user");
        setLoading(false);
        return;
      }

      setRole(data?.role || "user");
      setLoading(false);
    }

    fetchRole();
  }, [user]);

  console.log("ROLE:", role);

  return { role, loading };
}