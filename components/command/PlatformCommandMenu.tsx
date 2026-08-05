"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  BookOpen,
  Code,
  Command as CommandIcon,
  LayoutDashboard,
  List,
  MessageSquare,
  Medal,
  Route,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Trophy,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { startShellRouteProgress } from "@/components/navigation/ShellRouteProgress";
import { api, type LiveCodeData } from "@/lib/api";

type PlatformCommandMenuProps = {
  isAdmin: boolean;
  user: SupabaseUser | null;
};

type CommandEntry = {
  breadcrumb?: string[];
  href: string;
  icon: LucideIcon;
  keywords?: string[];
  label: string;
  shortcut?: string;
  shortcutKey?: string;
};

export function PlatformCommandMenu({ isAdmin, user }: PlatformCommandMenuProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(720);

  const { data: liveCodeData } = useQuery<LiveCodeData>({
    queryKey: ["command-menu", "livecode", user?.id],
    queryFn: () => api.live.getLiveCodeData(),
    enabled: open && Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (!window.matchMedia("(min-width: 640px)").matches) return;

        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const safari =
      /Safari/i.test(userAgent) &&
      !/Chrome|Chromium|CriOS|FxiOS|Edg/i.test(userAgent);

    function updateViewport() {
      setViewportHeight(window.innerHeight);
    }

    setIsSafari(safari);
    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const pageCommands = useMemo<CommandEntry[]>(() => {
    const commands: CommandEntry[] = [
      {
        href: "/problems",
        icon: List,
        label: t("nav.problems"),
        shortcut: "⌘ P",
        shortcutKey: "p",
        keywords: ["tasks", "exercises", "problems"],
      },
      {
        href: "/leaderboard",
        icon: Trophy,
        label: t("nav.leaderboard"),
        shortcut: "⌘ L",
        shortcutKey: "l",
        keywords: ["ranking", "score"],
      },
      {
        href: "/docs/basics",
        icon: BookOpen,
        label: t("nav.docs"),
        shortcut: "⌘ D",
        shortcutKey: "d",
        keywords: ["documentation", "learn", "syntax"],
      },
      {
        href: "/examples",
        icon: BookOpen,
        label: t("nav.examples"),
        keywords: ["samples", "algorithms"],
      },
      {
        href: "/updates",
        icon: Sparkles,
        label: t("nav.whatsNew"),
        keywords: ["updates", "news", "changelog"],
      },
    ];

    if (!user) return commands;

    commands.unshift(
      {
        href: "/learn",
        icon: Route,
        label: t("nav.learn"),
        keywords: ["roadmap", "learning path", "lessons"],
      },
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        label: t("nav.dashboard"),
        shortcut: "⌘ H",
        shortcutKey: "h",
        keywords: ["home", "overview"],
      },
      {
        href: "/competitions",
        icon: Medal,
        label: t("nav.competitions"),
        keywords: ["contest", "competition", "arena", "ranking"],
      },
      {
        href: "/shop",
        icon: ShoppingBag,
        label: t("nav.shop"),
        keywords: ["rewards", "points", "avatar", "badges"],
      },
      {
        href: "/editor",
        icon: Code,
        label: t("nav.editor"),
        shortcut: "⌘ E",
        shortcutKey: "e",
        keywords: ["miniscript", "snippet", "code"],
      },
      {
        href: "/livecode",
        icon: SquareTerminal,
        label: t("nav.livecode"),
        shortcut: "⌘ V",
        shortcutKey: "v",
        keywords: ["session", "collaboration"],
      },
      {
        href: "/feed",
        icon: MessageSquare,
        label: t("nav.feed"),
        keywords: ["posts", "social"],
      },
      {
        href: "/groups",
        icon: UsersRound,
        label: t("nav.groups"),
        keywords: ["groups", "study", "community", "discord"],
      },
      {
        href: "/search",
        icon: Search,
        label: t("nav.search"),
        keywords: ["users", "find"],
      },
      {
        href: "/classes",
        icon: Users,
        label: t("nav.classes"),
        keywords: ["school", "assignments"],
      },
      {
        href: "/profile",
        icon: User,
        label: t("user.profile"),
        shortcut: "⌘ U",
        shortcutKey: "u",
      },
      {
        href: "/settings",
        icon: Settings,
        label: t("user.settings"),
        shortcut: "⌘ S",
        shortcutKey: "s",
      }
    );

    if (isAdmin) {
      commands.push({
        href: "/admin",
        icon: Shield,
        label: t("nav.admin"),
        shortcut: "⌘ A",
        shortcutKey: "a",
        keywords: ["manage", "panel"],
      });
    }

    return commands;
  }, [isAdmin, t, user]);

  const liveSessionCommands = useMemo<CommandEntry[]>(() => {
    const rooms = liveCodeData?.rooms || [];

    return rooms.slice(0, 8).map((room) => ({
      href: `/live/${room.id}`,
      icon: SquareTerminal,
      label: room.name || t("command.untitledSession"),
      breadcrumb: [t("nav.livecode")],
      keywords: ["live", "session", room.status || ""],
    }));
  }, [liveCodeData, t]);

  const liveParticipantCommands = useMemo<CommandEntry[]>(() => {
    if (!liveCodeData?.participantsByRoom) return [];

    return liveSessionCommands.flatMap((session) => {
      const roomId = session.href.split("/").pop();
      if (!roomId) return [];

      const roomParticipants = liveCodeData.participantsByRoom[roomId] || [];

      return roomParticipants.slice(0, 4).map((participant) => ({
        href: participant.username ? `/u/${participant.username}` : session.href,
        icon: User,
        label: participant.username || t("user.user"),
        breadcrumb: [t("nav.livecode"), session.label],
        keywords: ["participant", "profile", session.label],
      }));
    });
  }, [liveCodeData, liveSessionCommands, t]);

  const runCommand = useCallback((href: string) => {
    setOpen(false);
    startShellRouteProgress();
    router.push(href);
  }, [router]);

  useEffect(() => {
    if (!open) return;

    function handleMenuShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;

      const key = event.key.toLowerCase();
      const command = pageCommands.find((entry) => entry.shortcutKey === key);
      if (!command) return;

      event.preventDefault();
      runCommand(command.href);
    }

    window.addEventListener("keydown", handleMenuShortcut);

    return () => window.removeEventListener("keydown", handleMenuShortcut);
  }, [open, pageCommands, runCommand]);

  const safariDialogMaxHeight = Math.max(
    280,
    Math.min(560, viewportHeight - 96)
  );
  const safariListMaxHeight = Math.max(
    180,
    Math.min(420, viewportHeight - 184)
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-md items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 text-sm text-zinc-500 shadow-inner transition hover:border-zinc-300 hover:bg-white sm:flex"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("command.placeholder")}</span>
        </span>
        <ShortcutKeys shortcut="⌘ K" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("command.title")}
        description={t("command.description")}
        className={`max-w-xl border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-xl ${
          isSafari ? "" : "max-h-[calc(100vh-4rem)]"
        }`}
        contentStyle={
          isSafari ? { maxHeight: safariDialogMaxHeight } : undefined
        }
      >
        <Command
          className={isSafari ? "" : "max-h-[calc(100vh-4rem)]"}
          style={isSafari ? { maxHeight: safariDialogMaxHeight } : undefined}
        >
          <CommandInput placeholder={t("command.placeholder")} />
          <CommandList
            className={`overflow-y-auto ${
              isSafari ? "" : "max-h-[calc(100vh-9rem)]"
            }`}
            style={isSafari ? { maxHeight: safariListMaxHeight } : undefined}
          >
            <CommandEmpty>{t("command.empty")}</CommandEmpty>

            <CommandGroup heading={t("command.groups.navigation")}>
              {pageCommands.map((command) => (
                <CommandMenuItem
                  key={command.href}
                  command={command}
                  onSelect={runCommand}
                />
              ))}
            </CommandGroup>

            {user && liveSessionCommands.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("command.groups.liveSessions")}>
                  {liveSessionCommands.map((command) => (
                    <CommandMenuItem
                      key={command.href}
                      command={command}
                      onSelect={runCommand}
                    />
                  ))}
                </CommandGroup>
              </>
            )}

            {user && liveParticipantCommands.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("command.groups.participants")}>
                  {liveParticipantCommands.map((command) => (
                    <CommandMenuItem
                      key={`${command.href}-${command.breadcrumb?.join("/")}`}
                      command={command}
                      onSelect={runCommand}
                    />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function CommandMenuItem({
  command,
  onSelect,
}: {
  command: CommandEntry;
  onSelect: (href: string) => void;
}) {
  const Icon = command.icon;
  const value = [
    command.label,
    command.href,
    ...(command.breadcrumb || []),
    ...(command.keywords || []),
  ].join(" ");

  return (
    <CommandItem value={value} onSelect={() => onSelect(command.href)}>
      <Icon className="h-4 w-4" />
      <div className="min-w-0 flex-1">
        <div className="truncate">{command.label}</div>
        {command.breadcrumb && (
          <div className="truncate text-xs text-muted-foreground">
            {command.breadcrumb.join(" > ")} &gt; {command.label}
          </div>
        )}
      </div>
      {command.shortcut && (
        <CommandShortcut>
          <ShortcutKeys shortcut={command.shortcut} />
        </CommandShortcut>
      )}
    </CommandItem>
  );
}

function ShortcutKeys({ shortcut }: { shortcut: string }) {
  return (
    <KbdGroup>
      {shortcut.split(" ").map((key) => (
        <Kbd key={key}>
          {key === "⌘" ? <CommandIcon className="h-3 w-3" /> : key}
        </Kbd>
      ))}
    </KbdGroup>
  );
}
