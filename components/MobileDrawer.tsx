"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  BookOpen,
  Code,
  HelpCircle,
  LayoutDashboard,
  List,
  Mail,
  Medal,
  MessageSquare,
  Route,
  School,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: (pathname: string) => boolean;
  children?: Array<{
    href: string;
    label: string;
  }>;
};

export function MobileDrawer() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const {
    hasUnread: hasUnreadUpdates,
    latestSlug: latestUpdateSlug,
  } = useUnreadUpdates();
  const { user, isAdmin } = useAuth();

  if (pathname.startsWith("/live/")) {
    return null;
  }

  const isLoggedIn = Boolean(user);

  const navItems: Array<{ label: string; items: MobileNavItem[] }> = [
    {
      label: t("sidebar.platform"),
      items: [
        ...(isLoggedIn
          ? [
              { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
              { href: "/editor", icon: Code, label: t("nav.editor") },
              {
                href: "/livecode",
                icon: SquareTerminal,
                label: t("nav.livecode"),
                active: (currentPath: string) =>
                  currentPath.startsWith("/livecode") ||
                  currentPath.startsWith("/live"),
              },
            ]
          : []),
        { href: "/problems", icon: List, label: t("nav.problems") },
        ...(isLoggedIn
          ? [
              { href: "/classes", icon: School, label: t("nav.classes") },
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
                icon: Route,
                label: t("nav.learn"),
                active: (currentPath: string) =>
                  currentPath === "/learn" ||
                  currentPath.startsWith("/learn/lesson"),
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
    },
  ];

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
      <Drawer>
        <DrawerTrigger asChild>
          <button
            aria-label={t("mobileDrawer.open")}
            data-tour="mobile-menu"
            className="flex h-7 w-28 items-center justify-center rounded-full border border-border/80 bg-background/80 shadow-[0_10px_30px_rgba(24,24,27,0.14)] backdrop-blur-xl transition-all duration-200 active:scale-95"
          >
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/60" />
          </button>
        </DrawerTrigger>

        <DrawerContent className="h-[82vh] rounded-t-[32px] border-border bg-sidebar/95 backdrop-blur-xl">
          <DrawerTitle className="sr-only">
            {t("mobileDrawer.title")}
          </DrawerTitle>

          <div className="flex h-full flex-col overflow-hidden px-5 pb-6 pt-5">
            <DrawerClose asChild>
              <Link
                href="/dashboard"
                aria-label="ScripticX Dashboard"
                className="mb-5 flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-sidebar-accent active:bg-sidebar-accent"
              >
                <Image
                  src="/logoSCX.svg"
                  alt="ScripticX"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain dark:invert"
                />

                <div className="min-w-0 text-left">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    ScripticX
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("mobileDrawer.subtitle")}
                  </p>
                </div>
              </Link>
            </DrawerClose>

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

              <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pb-8">
                {navItems.map((section) => (
                  <div
                    key={section.label}
                    className="flex w-full flex-col"
                  >
                    <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
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
                                className={`flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] ${
                                  active
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                }`}
                              >
                                <Icon size={22} />
                                <span>{item.label}</span>
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

                <div className="h-px w-full bg-border" />

                <div className="flex w-full flex-col gap-1">
                  {footerItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <DrawerClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] ${
                            active
                              ? "bg-accent text-accent-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                          }`}
                        >
                          <span className="relative inline-flex">
                            <Icon size={22} />
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
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
