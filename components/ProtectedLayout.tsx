"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user && pathname.startsWith("/search")) {
        router.push("/login");
        return;
      }

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("banned")
          .eq("id", user.id)
          .single();

        if (profile?.banned && pathname !== "/banned") {
          router.push("/banned");
        }
      }
    }

    check();
  }, [router, pathname]);

  return children;
}