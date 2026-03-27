import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserRole(user: any) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchRole() {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(data?.role || "user");
      setLoading(false);
    }

    fetchRole();
  }, [user]);

  return { role, loading };
}