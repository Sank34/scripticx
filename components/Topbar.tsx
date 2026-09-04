"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { ShellRouteProgress } from "@/components/navigation/ShellRouteProgress";
import { TopbarBreadcrumbs } from "@/components/navigation/TopbarBreadcrumbs";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useSavedAccounts } from "@/hooks/useSavedAccounts";
import {
  saveAccountSession,
  type SavedScripticXAccount,
} from "@/lib/account-switcher";
import {
  activateSavedAccount,
  logoutCurrentAccount,
} from "@/lib/account-session-manager";
import { supabase } from "@/lib/supabase";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

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
  LoaderCircle,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
  UserPlus,
} from "lucide-react";

const AddAccountDialog = dynamic(
  () =>
    import("@/components/account/AddAccountDialog").then(
      (module) => module.AddAccountDialog
    ),
  { ssr: false }
);
const PlatformCommandMenu = dynamic(
  () =>
    import("@/components/command/PlatformCommandMenu").then(
      (module) => module.PlatformCommandMenu
    ),
  { ssr: false }
);
const NotificationsPopover = dynamic(
  () =>
    import("@/components/notifications/NotificationsPopover").then(
      (module) => module.NotificationsPopover
    ),
  { ssr: false }
);
const AttentionPopover = dynamic(
  () =>
    import("@/components/admin/AttentionPopover").then(
      (module) => module.AttentionPopover
    ),
  { ssr: false }
);

export function Topbar() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile, user } = useAuth();
  const { accounts } = useSavedAccounts();
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(
    null
  );
  const [loggingOut, setLoggingOut] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user.id !== user.id) return;
      saveAccountSession(data.session, {
        avatarUrl: profile?.avatar_url || null,
        username: profile?.username || null,
      });
    });
  }, [profile?.avatar_url, profile?.username, user]);

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
    if (!user || switchingAccountId || loggingOut) return;
    setLoggingOut(true);

    try {
      const result = await logoutCurrentAccount(user.id);
      if (result) {
        toast.success(
          locale === "ro"
            ? `Te-ai deconectat și ai trecut pe contul ${result.account.nickname}.`
            : `Signed out and switched to ${result.account.nickname}.`
        );
        router.replace(
          getWorkspaceLandingRoute(result.session.user.user_metadata)
        );
      } else {
        router.replace("/login");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        locale === "ro"
          ? "Nu te-am putut deconecta fără să pierdem celelalte sesiuni."
          : "Could not sign out without losing the other sessions.",
        {
          description: error instanceof Error ? error.message : String(error),
        }
      );
    } finally {
      setLoggingOut(false);
    }
  }

  async function switchAccount(account: SavedScripticXAccount) {
    if (
      !user ||
      account.userId === user.id ||
      switchingAccountId ||
      loggingOut
    ) return;
    setSwitchingAccountId(account.userId);

    try {
      const { data: current } = await supabase.auth.getSession();
      if (current.session) {
        saveAccountSession(current.session, {
          avatarUrl: profile?.avatar_url || null,
          username: profile?.username || null,
        });
      }

      const session = await activateSavedAccount(account);

      toast.success(
        locale === "ro"
          ? `Ai trecut pe contul ${account.nickname}.`
          : `Switched to ${account.nickname}.`
      );
      router.replace(getWorkspaceLandingRoute(session.user.user_metadata));
      router.refresh();
    } catch (error) {
      toast.error(
        locale === "ro" ? "Contul nu a putut fi activat." : "Could not switch accounts.",
        {
          description: error instanceof Error ? error.message : String(error),
        }
      );
    } finally {
      setSwitchingAccountId(null);
    }
  }

  const currentSavedAccount = accounts.find(
    (account) => account.userId === user?.id
  );
  const otherAccounts = accounts.filter((account) => account.userId !== user?.id);

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
                    {currentSavedAccount?.nickname || profile?.username || "User"}
                  </span>

                  <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>

              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {otherAccounts.length ? (
                <>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {locale === "ro" ? "Alte conturi" : "Other accounts"}
                  </DropdownMenuLabel>
                  {otherAccounts.map((account) => (
                    <DropdownMenuItem
                      key={account.userId}
                      onSelect={() => void switchAccount(account)}
                      disabled={switchingAccountId !== null || loggingOut}
                      className="gap-3 py-2"
                    >
                      <UserAvatar
                        avatarUrl={account.avatarUrl}
                        username={account.username}
                        email={account.email}
                        className="size-8"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {account.nickname}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {account.email}
                        </span>
                      </span>
                      {switchingAccountId === account.userId ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuItem
                onSelect={() => setAddAccountOpen(true)}
                className="gap-2"
              >
                <UserPlus size={16} />
                {locale === "ro" ? "Adaugă alt cont" : "Add another account"}
              </DropdownMenuItem>

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
                onClick={() => void logout()}
                disabled={loggingOut || switchingAccountId !== null}
                className="flex items-center gap-2 text-red-500"
              >
                {loggingOut ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
                {otherAccounts.length
                  ? locale === "ro"
                    ? "Deconectează și schimbă contul"
                    : "Log out and switch account"
                  : t("user.logout")}
              </DropdownMenuItem>

            </DropdownMenuContent>

            </DropdownMenu>

            {addAccountOpen ? (
              <AddAccountDialog
                open={addAccountOpen}
                onOpenChange={setAddAccountOpen}
              />
            ) : null}
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
