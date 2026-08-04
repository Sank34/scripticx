"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  School,
  UsersRound,
  SquareTerminal,
  MessageSquare,
  Search,
  Trophy,
  Code,
  List,
  LayoutDashboard,
  Shield,
  PanelLeft,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Route,
  Sparkles,
  Mail,
  type LucideIcon,
} from "lucide-react";

import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { api, type ProfileSummary } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useGroupActivity } from "@/hooks/useGroupActivity";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";

type NavItemProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badgeCount?: number;
  hasActivity?: boolean;
};

type SubItemProps = {
  href: string;
  label: string;
};

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badgeCount = 0,
  hasActivity = false,
}: NavItemProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const hasBadge = badgeCount > 0;

  const content = (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      className={`h-10 w-full gap-2 rounded-xl text-[13px] font-medium transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
        active
          ? "bg-zinc-100 text-black shadow-sm"
          : "text-zinc-600"
      } ${
        collapsed
          ? "justify-center px-2"
          : "justify-start px-3"
      }`}
    >
      <Link
        href={href}
        data-tour={
          href === "/editor"
            ? "nav-editor"
            : href === "/learn"
              ? "nav-learn"
              : href === "/problems"
                ? "nav-problems"
                : undefined
        }
      >
        <span className="relative inline-flex shrink-0">
          <Icon size={18} />
          {collapsed && hasBadge && (
            <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[var(--sidebar)]">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
          {collapsed && !hasBadge && hasActivity && (
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-zinc-400 ring-2 ring-[var(--sidebar)]" />
          )}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && hasBadge && (
          <span className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
        {!collapsed && !hasBadge && hasActivity && (
          <span className="ml-auto size-2 rounded-full bg-zinc-400" />
        )}
      </Link>
    </Button>
  );

  if (!collapsed) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SubItem({ href, label }: SubItemProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={`h-9 w-full justify-start rounded-lg pl-8 text-sm transition-all duration-200 hover:bg-zinc-100 hover:text-black active:scale-[0.98] ${
        active
          ? "bg-zinc-100 text-black shadow-sm"
          : "text-zinc-600"
      }`}
    >
      <Link href={href}>
        {label}
      </Link>
    </Button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useLanguage();
  const {
    hasUnread: hasUnreadUpdates,
    latestSlug: latestUpdateSlug,
  } = useUnreadUpdates();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const groupActivity = useGroupActivity(user?.id);

  const [docsOpenOverride, setDocsOpenOverride] = useState<boolean | null>(null);
  const [examplesOpenOverride, setExamplesOpenOverride] = useState<boolean | null>(null);
  const docsActive = pathname.startsWith("/docs");
  const roadmapActive =
    pathname === "/learn" || pathname.startsWith("/learn/lesson");
  const openDocs = docsOpenOverride ?? docsActive;
  const openExamples = examplesOpenOverride ?? pathname.startsWith("/examples");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRole(currentUser: User) {
      const profile: ProfileSummary | null = await api.profiles.getSummary(
        currentUser.id
      );

      if (!active) return;

      setRole(profile?.role || "user");
    }

    async function load() {
      const { data } = await api.auth.getSession();
      const currentUser = data.session?.user ?? null;

      if (!active) return;

      setUser(currentUser);

      if (!currentUser) return;

      await loadRole(currentUser);
    }

    void load();

    const subscription = api.auth.onAuthStateChange((session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        return;
      }

      window.setTimeout(() => {
        void loadRole(currentUser);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function checkScrollable() {
      if (!scrollRef.current) return;

      const { scrollHeight, clientHeight } = scrollRef.current;
      setIsScrollable(scrollHeight > clientHeight + 4);
    }

    checkScrollable();

    window.addEventListener("resize", checkScrollable);

    return () => {
      window.removeEventListener("resize", checkScrollable);
    };
  }, [collapsed, openDocs, openExamples, pathname]);

  return (
    <Sidebar
      collapsible="icon"
      className="h-full bg-transparent overflow-hidden"
    >
      <SidebarContent className="flex h-full flex-col overflow-hidden">

        <div
          className={`sticky top-0 z-20 flex items-center justify-between bg-[var(--sidebar)] px-3 py-4 transition-all duration-200 ${
            isScrollable
              ? "border-b border-zinc-100/80"
              : "border-transparent"
          }`}
        >
          <div
            className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoSCX.svg"
                alt="ScripticX"
                className="h-9 w-9 object-contain"
              />

              <div className="flex flex-col leading-none">
                <span className="font-semibold text-[17px] tracking-tight">
                  ScripticX
                </span>

                <span className="text-xs text-muted-foreground">
                  Platform
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0"
          >
            <PanelLeft
              size={18}
              className={`transition-transform duration-300 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-0"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("sidebar.platform")}</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            { user && (
              <NavItem href="/editor" icon={Code} label={t("nav.editor")} active={pathname.startsWith("/editor")} />
            )}
            {user && (
              <NavItem href="/livecode" icon={SquareTerminal} label={t("nav.livecode")} active={pathname.startsWith("/livecode") || pathname.startsWith("/live") } />
            )}
            <NavItem href="/problems" icon={List} label={t("nav.problems")} active={pathname.startsWith("/problems")} />
            <NavItem href="/leaderboard" icon={Trophy} label={t("nav.leaderboard")} active={pathname.startsWith("/leaderboard")} />
            {user && (
              <NavItem href="/feed" icon={MessageSquare} label={t("nav.feed")} active={pathname.startsWith("/feed")} />
            )}
            {user && (
              <NavItem
                href="/groups"
                icon={UsersRound}
                label={t("nav.groups")}
                active={pathname.startsWith("/groups")}
                badgeCount={groupActivity.totalMentionCount}
                hasActivity={groupActivity.hasActivity}
              />
            )}
            {user && (
              <NavItem href="/dashboard" icon={LayoutDashboard} label={t("nav.dashboard")} active={pathname.startsWith("/dashboard")} />
            )}
            {user && (
              <NavItem href="/search" icon={Search} label={t("nav.search")} active={pathname.startsWith("/search")} />
            )}
            {role === "admin" && (
              <NavItem href="/admin" icon={Shield} label={t("nav.admin")} active={pathname.startsWith("/admin")} />
            )}
            {user && (
              <NavItem href="/classes" icon={School} label={t("nav.classes")} active={pathname.startsWith("/classes")} />
            )}

          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("sidebar.learn")}</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            
            {user && (
              <NavItem
              href="/learn"
              icon={Route}
              label={t("nav.learn")}
              active={roadmapActive}
            />
            )}
            

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <NavItem
                  href="/docs/basics"
                  icon={BookOpen}
                  label={t("nav.docs")}
                  active={docsActive}
                />

                {!collapsed && (
                  <button
                    onClick={() => {
                      setDocsOpenOverride(!openDocs);
                    }}
                    className="mr-2 p-1 hover:bg-muted rounded"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        openDocs ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {!collapsed && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openDocs ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-3 pl-3 space-y-1">
                    <SubItem href="/docs/basics" label={t("learn.basics")} />
                    <SubItem href="/docs/variables" label={t("learn.variables")} />
                    <SubItem href="/docs/loops" label={t("learn.loops")} />
                    <SubItem href="/docs/input-output" label={t("learn.inputOutput")} />
                  </div>
                </div>
              )}

            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <NavItem
                  href="/examples"
                  icon={BookOpen}
                  label={t("nav.examples")}
                  active={pathname.startsWith("/examples")}
                />

                {!collapsed && (
                  <button
                    onClick={() => {
                      setExamplesOpenOverride(!openExamples);
                    }}
                    className="mr-2 p-1 hover:bg-muted rounded"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        openExamples ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {!collapsed && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openExamples ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-3 pl-3 space-y-1">
                    <SubItem href="/examples/basics" label={t("examples.basics.title")} />
                    <SubItem href="/examples/loops" label={t("examples.loops.title")} />
                    <SubItem href="/examples/conditions" label={t("examples.conditions.title")} />
                    <SubItem href="/examples/algorithms" label={t("examples.algorithms.title")} />
                  </div>
                </div>
              )}
            </div>

          </SidebarGroupContent>
        </SidebarGroup>

        </div>

      </SidebarContent>
      <div
        className={`sticky bottom-0 z-20 mt-auto bg-[var(--sidebar)] px-2 py-3 transition-all duration-200 ${
          isScrollable
            ? "border-t border-zinc-100/80 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
            : "border-transparent shadow-none"
        }`}
      >
        <div className="space-y-1">

          <Button
            asChild
            variant="ghost"
            className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/updates") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
          >
            <Link
              href={latestUpdateSlug ? `/updates/${latestUpdateSlug}` : "/updates"}
              prefetch={false}
            >
              <span className="relative inline-flex">
                <Sparkles size={17} />
                {hasUnreadUpdates && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--sidebar)]" />
                  </span>
                )}
              </span>
              {!collapsed && <span>{t("nav.whatsNew")}</span>}
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/help") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
          >
            <Link href="/help">
              <HelpCircle size={17} />
              {!collapsed && <span>{t("nav.help")}</span>}
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/contact") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
          >
            <Link href="/contact">
              <Mail size={17} />
              {!collapsed && <span>{t("nav.contact")}</span>}
            </Link>
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
