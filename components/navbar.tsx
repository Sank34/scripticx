"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  return (
    <div className="border-b px-6 py-3 flex items-center justify-between">

      {/* Logo */}
      <Link href="/" className="text-lg font-bold">
        Scripticx
      </Link>

      {/* Navigation */}
      <div className="flex items-center gap-4">

        <Link href="/editor">
          <Button variant={pathname === "/editor" ? "default" : "ghost"}>
            Editor
          </Button>
        </Link>

        <Link href="/problems">
          <Button variant={pathname === "/problems" ? "default" : "ghost"}>
            Problems
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button variant={pathname === "/dashboard" ? "default" : "ghost"}>
            Dashboard
          </Button>
        </Link>

        {/* AUTH */}
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="default">
              Login
            </Button>
          </Link>
        )}

      </div>
    </div>
  );
}