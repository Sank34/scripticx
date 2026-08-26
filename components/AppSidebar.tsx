"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarResizeHandle,
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
  UsersRound,
  MessageSquare,
  Search,
  Trophy,
  Medal,
  LayoutDashboard,
  Shield,
  PanelLeft,
  BookOpen,
  HelpCircle,
  Sparkles,
  ShoppingBag,
  Mail,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useGroupActivity } from "@/hooks/useGroupActivity";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import {
  getTeacherWorkspaceNavigation,
  getStudentStudyNavigation,
  getStudentWorkspaceNavigation,
  isStudentWorkspaceContext,
  isTeacherWorkspaceContext,
  sharedStudyNavigationIcons,
} from "@/components/workspaces/WorkspaceNavigation";
import {
  formatWorkspaceNoteTime,
  useRecentWorkspaceNotes,
} from "@/components/workspaces/useRecentWorkspaceNotes";
import type { WorkspaceNote } from "@/lib/workspace-storage";

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
      className={`h-9 w-full gap-2 rounded-lg text-[13px] font-medium transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground"
      } ${
        collapsed
          ? "justify-center px-2"
          : "justify-start px-3"
      }`}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
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
          <Icon size={17} strokeWidth={1.8} />
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
      className={`h-8 w-full justify-start rounded-md pl-8 text-[13px] transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground"
      }`}
    >
      <Link href={href}>
        {label}
      </Link>
    </Button>
  );
}

function RecentNoteItem({
  note,
  locale,
}: {
  note: WorkspaceNote;
  locale: string;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const href = `/workspace/student/notes/${note.id}`;
  const active = pathname === href;
  const time = formatWorkspaceNoteTime(note.updatedAt, locale);
  const title = note.title.trim() || (locale === "ro" ? "Fără titlu" : "Untitled");

  const content = (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      className={`group/note h-9 w-full rounded-lg px-2 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground"
      } ${collapsed ? "justify-center" : "justify-start"}`}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        <FileText className="size-4 shrink-0" strokeWidth={1.8} />
        {!collapsed && (
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-foreground/85">
              {title}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/65">
              {time}
            </span>
          </span>
        )}
      </Link>
    </Button>
  );

  if (!collapsed) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          <span>{title}</span>
          {time && <span className="ml-1 text-background/65">· {time}</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { locale, t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const {
    hasUnread: hasUnreadUpdates,
    latestSlug: latestUpdateSlug,
  } = useUnreadUpdates();

  const groupActivity = useGroupActivity(user?.id);
  const studentWorkspaceActive = isStudentWorkspaceContext(
    pathname,
    user?.user_metadata as Record<string, unknown> | undefined
  );
  const teacherWorkspaceActive = isTeacherWorkspaceContext(
    pathname,
    user?.user_metadata as Record<string, unknown> | undefined
  );
  const workspaceSpecificActive =
    studentWorkspaceActive || teacherWorkspaceActive;
  const studentWorkspaceNavigation = getStudentWorkspaceNavigation(locale);
  const studentStudyNavigation = getStudentStudyNavigation(locale);
  const teacherWorkspaceNavigation = getTeacherWorkspaceNavigation(locale);
  const recentNotes = useRecentWorkspaceNotes(
    studentWorkspaceActive ? user?.id : null
  );

  const docsActive = pathname.startsWith("/docs");
  const examplesActive = pathname.startsWith("/examples");
  const roadmapActive =
    pathname === "/learn" || pathname.startsWith("/learn/");
  const openDocs = docsActive;
  const openExamples = examplesActive;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let frame = 0;

    function updateScrollShadows() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const element = scrollRef.current;
        if (!element) return;
        const { scrollHeight, clientHeight, scrollTop } = element;
        setCanScrollUp(scrollTop > 2);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2);
      });
    }

    updateScrollShadows();

    const resizeObserver = new ResizeObserver(updateScrollShadows);
    resizeObserver.observe(scrollElement);
    Array.from(scrollElement.children).forEach((child) =>
      resizeObserver.observe(child)
    );

    const mutationObserver = new MutationObserver(() => {
      Array.from(scrollElement.children).forEach((child) =>
        resizeObserver.observe(child)
      );
      updateScrollShadows();
    });
    mutationObserver.observe(scrollElement, {
      childList: true,
      subtree: true,
    });

    scrollElement.addEventListener("scroll", updateScrollShadows, {
      passive: true,
    });
    window.addEventListener("resize", updateScrollShadows);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      scrollElement.removeEventListener("scroll", updateScrollShadows);
      window.removeEventListener("resize", updateScrollShadows);
    };
  }, [collapsed, openDocs, openExamples, pathname]);

  return (
    <Sidebar
      collapsible="icon"
      className="h-full overflow-hidden bg-transparent"
    >
      <SidebarContent className="flex h-full flex-col overflow-hidden">

        <div
          className={`sticky top-0 z-20 flex items-center bg-sidebar transition-all duration-200 ${
            collapsed
              ? "flex-col gap-1 px-1 py-2"
              : "justify-between gap-1 px-2 py-2"
          } ${
            canScrollUp
              ? "border-b border-sidebar-border"
              : "border-transparent"
          }`}
        >
          <WorkspaceSwitcher collapsed={collapsed} />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="size-9 shrink-0 rounded-lg"
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

        {user && studentWorkspaceActive && (
          <SidebarGroup className="py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
            {!collapsed && (
              <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">
                {locale === "ro" ? "Workspace elev" : "Student workspace"}
              </SidebarGroupLabel>
            )}

            <SidebarGroupContent className="space-y-1">
              {studentWorkspaceNavigation.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={item.active(pathname)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && teacherWorkspaceActive && (
          <SidebarGroup className="py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
            {!collapsed && (
              <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">
                {locale === "ro" ? "Workspace profesor" : "Teacher workspace"}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="space-y-1">
              {teacherWorkspaceNavigation.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={item.active(pathname)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && studentWorkspaceActive && recentNotes.length > 0 && (
          <SidebarGroup className="py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
            {!collapsed && (
              <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">
                {locale === "ro" ? "Notițe recente" : "Recent notes"}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="space-y-0.5">
              {recentNotes.map((note) => (
                <RecentNoteItem key={note.id} note={note} locale={locale} />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && studentWorkspaceActive && (
          <SidebarGroup className="py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
            {!collapsed && (
              <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">
                {locale === "ro" ? "Învățare" : "Study"}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="space-y-1">
              {studentStudyNavigation.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={item.active(pathname)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!workspaceSpecificActive && <SidebarGroup className="py-1.5">
          {!collapsed && <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">{t("sidebar.platform")}</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            {user && (
              <NavItem href="/dashboard" icon={LayoutDashboard} label={t("nav.dashboard")} active={pathname.startsWith("/dashboard")} />
            )}
            { user && (
              <NavItem href="/editor" icon={sharedStudyNavigationIcons.editor} label={t("nav.editor")} active={pathname.startsWith("/editor")} />
            )}
            <NavItem href="/problems" icon={sharedStudyNavigationIcons.problems} label={t("nav.problems")} active={pathname.startsWith("/problems")} />
            {user && (
              <NavItem href="/search" icon={Search} label={t("nav.search")} active={pathname.startsWith("/search")} />
            )}
            {isAdmin && (
              <NavItem href="/admin" icon={Shield} label={t("nav.admin")} active={pathname.startsWith("/admin")} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>}

        {!workspaceSpecificActive && <SidebarGroup className="py-1.5">
          {!collapsed && <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">{t("sidebar.community")}</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            {user && (
              <NavItem href="/competitions" icon={Medal} label={t("nav.competitions")} active={pathname.startsWith("/competitions")} />
            )}
            <NavItem href="/leaderboard" icon={Trophy} label={t("nav.leaderboard")} active={pathname.startsWith("/leaderboard")} />
            {user && (
              <NavItem href="/shop" icon={ShoppingBag} label={t("nav.shop")} active={pathname.startsWith("/shop")} />
            )}
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
          </SidebarGroupContent>
        </SidebarGroup>}

        {!workspaceSpecificActive && <SidebarGroup className="py-1.5">
          {!collapsed && <SidebarGroupLabel className="h-8 px-3 text-xs font-medium normal-case tracking-normal text-muted-foreground">{t("sidebar.learn")}</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            
            {user && (
              <NavItem
              href="/learn"
              icon={sharedStudyNavigationIcons.learn}
              label={t("nav.learn")}
              active={roadmapActive}
            />
            )}
            

            <div className="space-y-1">
              <NavItem
                href="/docs/basics"
                icon={BookOpen}
                label={t("nav.docs")}
                active={docsActive}
              />

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
              <NavItem
                href="/examples"
                icon={BookOpen}
                label={t("nav.examples")}
                active={examplesActive}
              />

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
        </SidebarGroup>}

        </div>

      </SidebarContent>
      {!studentWorkspaceActive && <div
        className={`sticky bottom-0 z-20 mt-auto bg-sidebar px-2 py-3 transition-all duration-200 ${
          canScrollDown
            ? "border-t border-sidebar-border"
            : "border-transparent shadow-none"
        }`}
      >
        <div className="space-y-1">

          <Button
            asChild
            variant="ghost"
            className={`h-9 w-full rounded-lg text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/updates") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
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
            className={`h-9 w-full rounded-lg text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/help") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
          >
            <Link href="/help">
              <HelpCircle size={17} />
              {!collapsed && <span>{t("nav.help")}</span>}
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className={`h-9 w-full rounded-lg text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed ? "justify-center px-2" : "justify-start px-3"
            } ${pathname.startsWith("/contact") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
          >
            <Link href="/contact">
              <Mail size={17} />
              {!collapsed && <span>{t("nav.contact")}</span>}
            </Link>
          </Button>
        </div>
      </div>}
      <SidebarResizeHandle
        aria-label={t("sidebar.resize")}
        title={`${t("sidebar.resize")}. ${t("sidebar.resetWidth")}`}
      />
    </Sidebar>
  );
}
