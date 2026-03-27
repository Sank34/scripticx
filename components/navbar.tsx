"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

export function Navbar() {
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    async function getUserAndProfile() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, username, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();

        setRole(profile?.role || "user");
        setUsername(profile?.username || null);

        const validAvatar =
          profile?.avatar_url &&
          profile.avatar_url !== "null" &&
          profile.avatar_url.startsWith("http");

        setAvatar(validAvatar ? profile.avatar_url : null);
      }
    }

    getUserAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setUsername(null);
        setAvatar(null);
      } else {
        getUserAndProfile();
      }
    });

    const handler = () => {
      getUserAndProfile();
    };

    window.addEventListener("profile-updated", handler);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handler);
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  const rawName = username || user?.email || "U";
  const displayName =
    rawName.length > 25
      ? rawName.slice(0, 22) + "..."
      : rawName;

  const initial = rawName[0]?.toUpperCase();

  return (
    <div className="border-b px-6 py-3 flex items-center justify-between">

      <Link href="/" className="text-lg font-bold">
        Scripticx
      </Link>

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

        {role === "admin" && (
          <Link href="/admin">
            <Button variant={pathname.startsWith("/admin") ? "default" : "ghost"}>
              Admin
            </Button>
          </Link>
        )}

        {user ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="w-9 h-9 cursor-pointer">
                      {avatar && <AvatarImage src={avatar} />}
                      <AvatarFallback className="bg-muted font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">{displayName}</Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={logout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>

              <TooltipContent className="max-w-[200px] break-words text-center">
                {rawName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        )}

      </div>
    </div>
  );
}