"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  BookOpen,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Medal,
  MessageSquare,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  UsersRound,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
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
import { useAuth } from "@/hooks/useAuth";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MobileNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  meta?: string;
  active?: (pathname: string) => boolean;
  children?: Array<{
    href: string;
    label: string;
  }>;
};

export function MobileDrawer() {
  const pathname = usePathname();
  const { locale, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    hasUnread: hasUnreadUpdates,
    latestSlug: latestUpdateSlug,
  } = useUnreadUpdates();
  const { user, isAdmin } = useAuth();
  const studentWorkspaceActive = isStudentWorkspaceContext(
    pathname,
    user?.user_metadata as Record<string, unknown> | undefined
  );
  const teacherWorkspaceActive = isTeacherWorkspaceContext(
    pathname,
    user?.user_metadata as Record<string, unknown> | undefined
  );
  const recentNotes = useRecentWorkspaceNotes(
    studentWorkspaceActive ? user?.id : null
  );

  if (
    pathname.startsWith("/live/") ||
    pathname.startsWith("/editor/live/")
  ) {
    return null;
  }

  const isLoggedIn = Boolean(user);
  const studentWorkspaceNavigation = getStudentWorkspaceNavigation(locale);
  const studentStudyNavigation = getStudentStudyNavigation(locale);
  const teacherWorkspaceNavigation = getTeacherWorkspaceNavigation(locale);

  const navItems: Array<{ label: string; items: MobileNavItem[] }> =
    isLoggedIn && teacherWorkspaceActive
      ? [
          {
            label: locale === "ro" ? "Workspace profesor" : "Teacher workspace",
            items: teacherWorkspaceNavigation,
          },
        ]
      : isLoggedIn && studentWorkspaceActive
      ? [
          {
            label: locale === "ro" ? "Workspace elev" : "Student workspace",
            items: studentWorkspaceNavigation,
          },
          ...(recentNotes.length
            ? [
                {
                  label: locale === "ro" ? "Notițe recente" : "Recent notes",
                  items: recentNotes.map((note) => ({
                    href: `/workspace/student/notes/${note.id}`,
                    icon: FileText,
                    label:
                      note.title.trim() ||
                      (locale === "ro" ? "Fără titlu" : "Untitled"),
                    meta: formatWorkspaceNoteTime(note.updatedAt, locale),
                    active: (currentPath: string) =>
                      currentPath === `/workspace/student/notes/${note.id}`,
                  })),
                },
              ]
            : []),
          {
            label: locale === "ro" ? "Învățare" : "Study",
            items: studentStudyNavigation,
          },
        ]
      : [{
      label: t("sidebar.platform"),
      items: [
        ...(isLoggedIn
          ? [
              { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
              {
                href: "/editor",
                icon: sharedStudyNavigationIcons.editor,
                label: t("nav.editor"),
              },
            ]
          : []),
        {
          href: "/problems",
          icon: sharedStudyNavigationIcons.problems,
          label: t("nav.problems"),
        },
        ...(isLoggedIn
          ? [
              { href: "/search", icon: Search, label: t("nav.search") },
              ...(isAdmin
                ? [{ href: "/admin", icon: Shield, label: t("nav.admin") }]
                : []),
            ]
          : []),
      ],
    },
    {
      label: t("sidebar.community"),
      items: [
        ...(isLoggedIn
          ? [{ href: "/competitions", icon: Medal, label: t("nav.competitions") }]
          : []),
        { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard") },
        ...(isLoggedIn
          ? [
              { href: "/shop", icon: ShoppingBag, label: t("nav.shop") },
              { href: "/feed", icon: MessageSquare, label: t("nav.feed") },
              { href: "/groups", icon: UsersRound, label: t("nav.groups") },
            ]
          : []),
      ],
    },
    {
      label: t("sidebar.learn"),
      items: [
        ...(isLoggedIn
          ? [
              {
                href: "/learn",
                icon: sharedStudyNavigationIcons.learn,
                label: t("nav.learn"),
                active: (currentPath: string) =>
                  currentPath === "/learn" ||
                  currentPath.startsWith("/learn/"),
              },
            ]
          : []),
        {
          href: "/docs/basics",
          icon: BookOpen,
          label: t("nav.docs"),
          active: (currentPath: string) => currentPath.startsWith("/docs"),
          children: [
            { href: "/docs/basics", label: t("learn.basics") },
            { href: "/docs/variables", label: t("learn.variables") },
            { href: "/docs/loops", label: t("learn.loops") },
            { href: "/docs/input-output", label: t("learn.inputOutput") },
          ],
        },
        {
          href: "/examples",
          icon: BookOpen,
          label: t("nav.examples"),
          children: [
            { href: "/examples/basics", label: t("examples.basics.title") },
            { href: "/examples/loops", label: t("examples.loops.title") },
            { href: "/examples/conditions", label: t("examples.conditions.title") },
            { href: "/examples/algorithms", label: t("examples.algorithms.title") },
          ],
        },
      ],
    }];

  const footerItems = [
    {
      href: latestUpdateSlug ? `/updates/${latestUpdateSlug}` : "/updates",
      icon: Sparkles,
      label: t("nav.whatsNew"),
      unread: hasUnreadUpdates,
    },
    { href: "/help", icon: HelpCircle, label: t("nav.help") },
    { href: "/contact", icon: Mail, label: t("nav.contact") },
  ];

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-50 -translate-x-1/2 md:hidden">
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <button
            aria-label={t("mobileDrawer.open")}
            data-tour="mobile-menu"
            className="flex h-8 w-24 items-center justify-center rounded-full border border-border bg-background/95 shadow-md backdrop-blur-xl transition-transform duration-150 active:scale-95"
          >
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/60" />
          </button>
        </DrawerTrigger>

        <DrawerContent className="h-[82vh] rounded-t-[var(--sx-radius-shell)] border-border bg-sidebar/98 backdrop-blur-xl">
          <DrawerTitle className="sr-only">
            {t("mobileDrawer.title")}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {locale === "ro"
              ? "Navighează între paginile și workspace-urile ScripticX."
              : "Navigate between ScripticX pages and workspaces."}
          </DrawerDescription>

          <div className="flex h-full flex-col overflow-hidden px-4 pb-6 pt-4">
            <div className="mb-4 border-b border-sidebar-border pb-3">
              <WorkspaceSwitcher
                variant="mobile"
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>

            <div
              className="flex-1 overflow-y-auto"
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

              <div className="mx-auto flex w-full max-w-sm flex-col gap-5 pb-8">
                {navItems.map((section, sectionIndex) => (
                  <div
                    key={section.label}
                    className="flex w-full flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                    style={{ animationDelay: `${sectionIndex * 45}ms` }}
                  >
                    <h3 className="mb-1.5 px-3 text-xs font-medium tracking-normal text-muted-foreground">
                      {section.label}
                    </h3>

                    <div className="flex w-full flex-col gap-1">
                      {section.items.map((item) => {
                        const active = item.active
                          ? item.active(pathname)
                          : pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                          <div key={item.href} className="w-full">
                            <DrawerClose asChild>
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
                                  active
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                }`}
                              >
                                <Icon size={19} strokeWidth={1.8} />
                                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                                  <span className="min-w-0 flex-1 truncate text-left">
                                    {item.label}
                                  </span>
                                  {item.meta && (
                                    <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground/65">
                                      {item.meta}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </DrawerClose>

                            {item.children && active && (
                              <div className="mt-1 flex flex-col gap-1 pl-11">
                                {item.children.map((child) => {
                                  const childActive = pathname === child.href;

                                  return (
                                    <DrawerClose asChild key={child.href}>
                                      <Link
                                        href={child.href}
                                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                          childActive
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                        }`}
                                      >
                                        {child.label}
                                      </Link>
                                    </DrawerClose>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!studentWorkspaceActive && <div className="h-px w-full bg-border" />}

                {!studentWorkspaceActive && <div className="flex w-full flex-col gap-1">
                  {footerItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <DrawerClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                          }`}
                        >
                          <span className="relative inline-flex">
                            <Icon size={19} strokeWidth={1.8} />
                            {item.unread && (
                              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                              </span>
                            )}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      </DrawerClose>
                    );
                  })}
                </div>}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
