"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();

      const session = data.session;

      if (!session) {
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(session.user);
      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) return null;

  return children(user);
}