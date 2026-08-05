"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { PlatformCommandMenu } from "@/components/command/PlatformCommandMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { ShellRouteProgress } from "@/components/navigation/ShellRouteProgress";
import { TopbarBreadcrumbs } from "@/components/navigation/TopbarBreadcrumbs";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { AttentionPopover } from "@/components/admin/AttentionPopover";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";

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

export function Topbar() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const { profile, user } = useAuth();

  async function logout() {
    await api.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="relative grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-zinc-200/70 bg-white px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,26rem)_minmax(0,1fr)]">

      <div className="flex min-w-0 items-center overflow-hidden pr-3">
        <TopbarBreadcrumbs />
      </div>

      <div className="hidden min-w-0 justify-center lg:flex">
        <div className="w-full">
          <PlatformCommandMenu
            isAdmin={profile?.role === "admin"}
            user={user}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-self-end gap-2 pl-3">

        {user ? (
          <>
            <AttentionPopover isAdmin={profile?.role === "admin"} />

            <NotificationsPopover user={user} />

            <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-zinc-100">
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  email={user.email}
                  equippedRewards={profile?.equipped_rewards}
                  className="h-8 w-8"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-64 rounded-2xl"
            >
              <DropdownMenuLabel className="flex items-center gap-3 py-3">

                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  email={user.email}
                  equippedRewards={profile?.equipped_rewards}
                  className="h-10 w-10"
                />

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
          </>
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

      <ShellRouteProgress />

    </header>
  );
}
