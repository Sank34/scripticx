"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Globe,
  LogOut,
  Settings,
  User,
} from "lucide-react";

type TopbarProfile = {
  username?: string | null;
  avatar_url?: string | null;
};

export function Topbar() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<TopbarProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile(currentUser: SupabaseUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle<TopbarProfile>();

      if (!active) return;

      setProfile(profileData);
    }

    async function load() {
      const { data } = await supabase.auth.getSession();

      const currentUser = data.session?.user ?? null;

      if (!active) return;

      setUser(currentUser);

      if (!currentUser) return;

      await loadProfile(currentUser);
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          return;
        }

        window.setTimeout(() => {
          void loadProfile(currentUser);
        }, 0);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const initial = (
    profile?.username || user?.email || "U"
  )[0]?.toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200/70 bg-white px-5">

      <div className="flex items-center gap-3">
        <div className="text-sm font-medium text-zinc-900">
          Workspace
        </div>
      </div>

      <div className="flex items-center gap-2">

        {user ? (
          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-zinc-100">
                <Avatar className="h-8 w-8">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} />
                  )}

                  <AvatarFallback>
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-64 rounded-2xl"
            >
              <DropdownMenuLabel className="flex items-center gap-3 py-3">

                <Avatar className="h-10 w-10">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} />
                  )}

                  <AvatarFallback>
                    {initial}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col leading-tight">
                  <span className="font-medium">
                    {profile?.username || "User"}
                  </span>

                  <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>

              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2"
                >
                  <User size={16} />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Globe size={16} />
                  {t("user.language")}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      setLocale("en");
                      document.cookie = "locale=en; path=/";
                    }}
                    className={`px-2 py-0.5 rounded ${locale === "en" ? "bg-muted" : "hover:bg-muted/50"}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => {
                      setLocale("ro");
                      document.cookie = "locale=ro; path=/";
                    }}
                    className={`px-2 py-0.5 rounded ${locale === "ro" ? "bg-muted" : "hover:bg-muted/50"}`}
                  >
                    RO
                  </button>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-red-500"
              >
                <LogOut size={16} />
                Logout
              </DropdownMenuItem>

            </DropdownMenuContent>

          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button
              size="sm"
              className="rounded-xl"
            >
              Login
            </Button>
          </Link>
        )}

      </div>

    </header>
  );
}
