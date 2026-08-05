import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useUserRole(user: User | null) {
  const { data: role = null, isPending: loading } = useQuery({
    queryKey: ["profile", user?.id, "role"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role || "user";
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });

  return { role, loading };
}
