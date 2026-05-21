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
  Sparkles,
  Mail,
} from "lucide-react";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useLanguage();
  const hasUnreadUpdates = useUnreadUpdates();

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [openDocs, setOpenDocs] = useState(false);
  const [manualToggle, setManualToggle] = useState(false);

  const [openExamples, setOpenExamples] = useState(false);
  const [manualToggleExamples, setManualToggleExamples] = useState(false);

  const initialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      if (!active) return;

      setUser(currentUser);

      if (!currentUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!active) return;

      setRole(profile?.role || "user");
      setUsername(profile?.username || null);

      const validAvatar =
        profile?.avatar_url &&
        profile.avatar_url.startsWith("http");

      setAvatar(validAvatar ? profile.avatar_url : null);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setUsername(null);
        setAvatar(null);
        return;
      }

      supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          setRole(data?.role || "user");
          setUsername(data?.username || null);

          const validAvatar =
            data?.avatar_url &&
            data.avatar_url.startsWith("http");

          setAvatar(validAvatar ? data.avatar_url : null);
        });
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

  useEffect(() => {
    if (pathname.startsWith("/learn") && !manualToggle) {
      setOpenDocs(true);
    }

    if (pathname.startsWith("/examples") && !manualToggleExamples) {
      setOpenExamples(true);
    }
  }, [pathname]);


  function NavItem({ href, icon: Icon, label, active }: any) {
    const content = (
      <Link href={href}>
        <Button
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
          <Icon size={18} />
          {!collapsed && label}
        </Button>
      </Link>
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

  function SubItem({ href, label }: any) {
    const active = pathname === href;

    return (
      <Link href={href}>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className={`h-9 w-full justify-start rounded-lg pl-8 text-sm transition-all duration-200 hover:bg-zinc-100 hover:text-black active:scale-[0.98] ${
            active
              ? "bg-zinc-100 text-black shadow-sm"
              : "text-zinc-600"
          }`}
        >
          {label}
        </Button>
      </Link>
    );
  }

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
              <NavItem href="/livecode" icon={SquareTerminal} label={"Live Code"} active={pathname.startsWith("/livecode") || pathname.startsWith("/live") } />
            )}
            <NavItem href="/problems" icon={List} label={t("nav.problems")} active={pathname.startsWith("/problems")} />
            <NavItem href="/leaderboard" icon={Trophy} label={t("nav.leaderboard")} active={pathname.startsWith("/leaderboard")} />
            {user && (
              <NavItem href="/feed" icon={MessageSquare} label={t("nav.feed")} active={pathname.startsWith("/feed")} />
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <NavItem
                  href="/learn"
                  icon={BookOpen}
                  label={t("nav.docs")}
                  active={pathname.startsWith("/learn")}
                />

                {!collapsed && (
                  <button
                    onClick={() => {
                      setOpenDocs((prev) => !prev);
                      setManualToggle(true);
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
                    <SubItem href="/learn/basics" label={t("learn.basics")} />
                    <SubItem href="/learn/variables" label={t("learn.variables")} />
                    <SubItem href="/learn/loops" label={t("learn.loops")} />
                    <SubItem href="/learn/input-output" label={t("learn.inputOutput")} />
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
                      setOpenExamples((prev) => !prev);
                      setManualToggleExamples(true);
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

          <Link href="/updates" className="relative block">
            <Button
              variant="ghost"
              className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
                collapsed ? "justify-center px-2" : "justify-start px-3"
              } ${pathname.startsWith("/updates") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
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
            </Button>
          </Link>

          <Link href="/help">
            <Button
              variant="ghost"
              className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
                collapsed ? "justify-center px-2" : "justify-start px-3"
              } ${pathname.startsWith("/help") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
            >
              <HelpCircle size={17} />
              {!collapsed && <span>{t("nav.help")}</span>}
            </Button>
          </Link>

          <Link href="/contact">
            <Button
              variant="ghost"
              className={`h-10 w-full rounded-xl text-[13px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-black hover:shadow-sm active:scale-[0.98] ${
                collapsed ? "justify-center px-2" : "justify-start px-3"
              } ${pathname.startsWith("/contact") ? "bg-zinc-100 text-black shadow-sm" : ""}`}
            >
              <Mail size={17} />
              {!collapsed && <span>{t("nav.contact")}</span>}
            </Button>
          </Link>
        </div>
      </div>
    </Sidebar>
  );
}