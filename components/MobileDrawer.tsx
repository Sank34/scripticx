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
  ChevronUp,
  Code,
  HelpCircle,
  LayoutDashboard,
  List,
  Mail,
  MessageSquare,
  School,
  Search,
  Sparkles,
  SquareTerminal,
  Trophy,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileDrawer() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const hasUnreadUpdates = useUnreadUpdates();

  const navItems = [
    {
      label: t("sidebar.platform"),
      items: [
        { href: "/editor", icon: Code, label: t("nav.editor") },
        { href: "/livecode", icon: SquareTerminal, label: t("nav.livecode") },
        { href: "/problems", icon: List, label: t("nav.problems") },
        { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard") },
        { href: "/feed", icon: MessageSquare, label: t("nav.feed") },
        { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
        { href: "/search", icon: Search, label: t("nav.search") },
        { href: "/classes", icon: School, label: t("nav.classes") },
      ],
    },
    {
      label: t("sidebar.learn"),
      items: [
        { href: "/learn", icon: BookOpen, label: t("nav.docs") },
        { href: "/examples", icon: BookOpen, label: t("nav.examples") },
      ],
    },
  ];

  const footerItems = [
    {
      href: "/updates",
      icon: Sparkles,
      label: t("nav.whatsNew"),
      unread: hasUnreadUpdates,
    },
    { href: "/help", icon: HelpCircle, label: t("nav.help") },
    { href: "/contact", icon: Mail, label: t("nav.contact") },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <button
            aria-label={t("mobileDrawer.open")}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronUp size={22} className="text-zinc-700" />
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
                              <Icon size={22} />
                              <span>{item.label}</span>
                            </Link>
                          </DrawerClose>
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
