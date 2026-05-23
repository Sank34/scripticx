"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  BookOpen,
  Code,
  LayoutDashboard,
  List,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Sparkles,
  SquareTerminal,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
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
};

export function PlatformCommandMenu({ isAdmin, user }: PlatformCommandMenuProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const { data: liveCodeData } = useQuery<LiveCodeData>({
    queryKey: ["command-menu", "livecode", user?.id],
    queryFn: () => api.live.getLiveCodeData(),
    enabled: open && Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pageCommands = useMemo<CommandEntry[]>(() => {
    const commands: CommandEntry[] = [
      {
        href: "/problems",
        icon: List,
        label: t("nav.problems"),
        shortcut: "G P",
        keywords: ["tasks", "exercises", "problems"],
      },
      {
        href: "/leaderboard",
        icon: Trophy,
        label: t("nav.leaderboard"),
        shortcut: "G L",
        keywords: ["ranking", "score"],
      },
      {
        href: "/learn",
        icon: BookOpen,
        label: t("nav.docs"),
        shortcut: "G D",
        keywords: ["documentation", "learn"],
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
        href: "/dashboard",
        icon: LayoutDashboard,
        label: t("nav.dashboard"),
        shortcut: "G H",
        keywords: ["home", "overview"],
      },
      {
        href: "/editor",
        icon: Code,
        label: t("nav.editor"),
        shortcut: "G E",
        keywords: ["miniscript", "snippet", "code"],
      },
      {
        href: "/livecode",
        icon: SquareTerminal,
        label: t("nav.livecode"),
        shortcut: "G V",
        keywords: ["session", "collaboration"],
      },
      {
        href: "/feed",
        icon: MessageSquare,
        label: t("nav.feed"),
        keywords: ["posts", "social"],
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
        shortcut: "G U",
      },
      {
        href: "/settings",
        icon: Settings,
        label: t("user.settings"),
        shortcut: "G S",
      }
    );

    if (isAdmin) {
      commands.push({
        href: "/admin",
        icon: Shield,
        label: t("nav.admin"),
        shortcut: "G A",
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

  function runCommand(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 text-sm text-zinc-500 shadow-inner transition hover:border-zinc-300 hover:bg-white sm:flex"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("command.placeholder")}</span>
        </span>
        <kbd className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 shadow-sm">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 sm:hidden"
        aria-label={t("command.open")}
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("command.title")}
        description={t("command.description")}
        className="max-w-xl border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-xl"
      >
        <CommandInput placeholder={t("command.placeholder")} />
        <CommandList className="max-h-[420px]">
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
      {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
    </CommandItem>
  );
}
