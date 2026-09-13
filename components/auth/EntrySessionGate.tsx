"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionWithTimeout } from "@/lib/auth-client";

export function EntrySessionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const entryRoute = pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/workspace/");
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let authChanged = false;
    const applySession = (hasSession: boolean) => {
      if (!active) return;
      setAuthenticated(hasSession);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      authChanged = true;
      applySession(Boolean(session));
    });
    void getSessionWithTimeout(6000).then(({ data }) => {
      if (!authChanged) applySession(Boolean(data.session));
    }).catch(() => { if (!authChanged) applySession(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (entryRoute && authenticated === false) router.replace("/login");
  }, [authenticated, entryRoute, router]);

  // Keep the same child tree across routes so onboarding and tours stay mounted.
  if (entryRoute && authenticated !== true) return null;
  return children;
}
