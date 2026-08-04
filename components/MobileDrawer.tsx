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
  MessageSquare,
  Route,
  School,
  Search,
  Shield,
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
        { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard") },
        ...(isLoggedIn
          ? [
              { href: "/feed", icon: MessageSquare, label: t("nav.feed") },
              { href: "/groups", icon: UsersRound, label: t("nav.groups") },
              { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
              { href: "/search", icon: Search, label: t("nav.search") },
              ...(isAdmin
                ? [{ href: "/admin", icon: Shield, label: t("nav.admin") }]
                : []),
              { href: "/classes", icon: School, label: t("nav.classes") },
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
            className="flex h-7 w-28 items-center justify-center rounded-full border border-zinc-200/80 bg-white/80 shadow-[0_10px_30px_rgba(24,24,27,0.14)] backdrop-blur-xl transition-all duration-200 active:scale-95"
          >
            <span className="h-1.5 w-12 rounded-full bg-zinc-400" />
          </button>
        </DrawerTrigger>

        <DrawerContent className="h-[82vh] rounded-t-[32px] border-zinc-200 bg-white/95 backdrop-blur-xl">
          <DrawerTitle className="sr-only">
            {t("mobileDrawer.title")}
          </DrawerTitle>

          <div className="flex h-full flex-col overflow-hidden px-8 pb-10 pt-8">
            <div className="mb-10 flex flex-col items-center justify-center text-center">
              <Image
                src="/logoSCX.svg"
                alt="ScripticX"
                width={56}
                height={56}
                className="mb-3 h-14 w-14 object-contain"
              />

              <h2 className="text-3xl font-semibold tracking-tight text-black">
                ScripticX
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {t("mobileDrawer.subtitle")}
              </p>
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

              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-10 pb-12">
                {navItems.map((section) => (
                  <div
                    key={section.label}
                    className="flex w-full flex-col items-center"
                  >
                    <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                      {section.label}
                    </h3>

                    <div className="flex w-full flex-col items-center gap-2">
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
                                className={`flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-medium transition-all duration-200 active:scale-[0.98] ${
                                  active
                                    ? "bg-zinc-100 text-black shadow-sm"
                                    : "text-zinc-600 hover:bg-zinc-50 hover:text-black"
                                }`}
                              >
                                <Icon size={22} />
                                <span>{item.label}</span>
                              </Link>
                            </DrawerClose>

                            {item.children && active && (
                              <div className="mt-2 flex flex-col items-center gap-1">
                                {item.children.map((child) => {
                                  const childActive = pathname === child.href;

                                  return (
                                    <DrawerClose asChild key={child.href}>
                                      <Link
                                        href={child.href}
                                        className={`w-full rounded-xl px-4 py-2 text-center text-sm font-medium transition ${
                                          childActive
                                            ? "bg-zinc-100 text-black"
                                            : "text-zinc-500 hover:bg-zinc-50 hover:text-black"
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

                <div className="h-px w-24 bg-zinc-200" />

                <div className="flex w-full flex-col items-center gap-2">
                  {footerItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <DrawerClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-medium transition-all duration-200 active:scale-[0.98] ${
                            active
                              ? "bg-zinc-100 text-black shadow-sm"
                              : "text-zinc-600 hover:bg-zinc-50 hover:text-black"
                          }`}
                        >
                          <span className="relative inline-flex">
                            <Icon size={22} />
                            {item.unread && (
                              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
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
