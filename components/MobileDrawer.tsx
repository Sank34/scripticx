"use client";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/drawer";

import {
  ChevronUp,
  Code,
  SquareTerminal,
  List,
  Trophy,
  MessageSquare,
  LayoutDashboard,
  Search,
  School,
  BookOpen,
  Sparkles,
  HelpCircle,
  Mail,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileDrawer() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Platform",
      items: [
        { href: "/editor", icon: Code, label: "Editor" },
        { href: "/livecode", icon: SquareTerminal, label: "Live Code" },
        { href: "/problems", icon: List, label: "Problems" },
        { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
        { href: "/feed", icon: MessageSquare, label: "Feed" },
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/search", icon: Search, label: "Search" },
        { href: "/classes", icon: School, label: "Classes" },
      ],
    },
    {
      label: "Learn",
      items: [
        { href: "/learn", icon: BookOpen, label: "Docs" },
        { href: "/examples", icon: BookOpen, label: "Examples" },
      ],
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:hidden">

      <Drawer>

        <DrawerTrigger asChild>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronUp size={22} className="text-zinc-700" />
          </button>
        </DrawerTrigger>

        <DrawerContent
          className="h-[82vh] rounded-t-[32px] border-zinc-200 bg-white/95 backdrop-blur-xl"
        >
          {/* <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-zinc-300" /> */}
          <DrawerTitle className="sr-only">
            Mobile Navigation
          </DrawerTitle>
          <div className="flex h-full flex-col overflow-hidden px-8 pb-10 pt-8">

            <div className="mb-10 flex flex-col items-center justify-center text-center">
              <img
                src="/logoSCX.svg"
                alt="ScripticX"
                className="mb-3 h-14 w-14 object-contain"
              />

              <h2 className="text-3xl font-semibold tracking-tight text-black">
                ScripticX
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Platform Navigation
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
                          <Link
                            key={item.href}
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
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="h-px w-24 bg-zinc-200" />

                <div className="flex w-full flex-col items-center gap-2">

                  <button className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-50 hover:text-black active:scale-[0.98]">
                    <Sparkles size={22} />
                    <span>What's new</span>
                  </button>

                  <button className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-50 hover:text-black active:scale-[0.98]">
                    <HelpCircle size={22} />
                    <span>Help</span>
                  </button>

                  <button className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-50 hover:text-black active:scale-[0.98]">
                    <Mail size={22} />
                    <span>Contact</span>
                  </button>

                </div>

              </div>
            </div>
          </div>
        </DrawerContent>

      </Drawer>

    </div>
  );
}