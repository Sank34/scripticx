"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile, user } = useAuth();
  const [themeMounted, setThemeMounted] = useState(false);
  const themeTransitionId = useRef(0);
  const requestedTheme = useRef<string | undefined>(theme);

  useEffect(() => {
    setThemeMounted(true);

    return () => {
      document.documentElement.classList.remove("theme-transition");
    };
  }, []);

  useEffect(() => {
    requestedTheme.current = theme;
  }, [theme]);

  function changeTheme(nextTheme: "light" | "dark" | "system") {
    if (requestedTheme.current === nextTheme) return;
    requestedTheme.current = nextTheme;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => {
        finished: Promise<void>;
      };
    };
    const resolvedNextTheme =
      nextTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : nextTheme;
    const applyTheme = () => {
      root.classList.toggle("dark", resolvedNextTheme === "dark");
      root.style.colorScheme = resolvedNextTheme;
      setTheme(nextTheme);
    };

    if (reduceMotion || !viewTransitionDocument.startViewTransition) {
      applyTheme();
      return;
    }

    const transitionId = ++themeTransitionId.current;
    const finishTransition = () => {
      if (themeTransitionId.current === transitionId) {
        root.classList.remove("theme-transition");
      }
    };

    root.classList.add("theme-transition");
    try {
      const transition = viewTransitionDocument.startViewTransition(() => {
        if (themeTransitionId.current !== transitionId) return;
        applyTheme();
      });

      void transition.finished.then(finishTransition, finishTransition);
    } catch {
      if (themeTransitionId.current === transitionId) {
        applyTheme();
      }
      finishTransition();
    }
  }

  async function logout() {
    await api.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="relative grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border/70 bg-background px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,26rem)_minmax(0,1fr)]">

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
              <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-accent">
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
                  {t("user.profile")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2"
                >
                  <Settings size={16} />
                  {t("user.settings")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={(event) => event.preventDefault()}
                className="flex flex-col items-stretch gap-2 p-2"
              >
                <div className="flex items-center gap-2">
                  <Sun size={16} />
                  {t("user.appearance")}
                </div>

                <div
                  role="group"
                  aria-label={t("user.appearance")}
                  className="grid grid-cols-3 items-center rounded-lg bg-muted p-0.5"
                >
                  {([
                    { value: "light", label: t("user.light"), icon: Sun },
                    { value: "dark", label: t("user.dark"), icon: Moon },
                    { value: "system", label: t("user.auto"), icon: Monitor },
                  ] as const).map((option) => {
                    const Icon = option.icon;
                    const active = themeMounted && theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={active}
                        onClick={() => changeTheme(option.value)}
                        className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors ${
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
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
                {t("user.logout")}
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
