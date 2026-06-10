"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { fetchUpdates } from "@/lib/updates";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import { markUpdatesSeen } from "@/hooks/useUnreadUpdates";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpdatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { locale } = useLanguage();

  const title = locale === "ro" ? "Noutăți" : "What's new";

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
  });

  const latestSlug = updates[0]?.slug;

  useEffect(() => {
    if (latestSlug) markUpdatesSeen(latestSlug);
  }, [latestSlug]);

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">

      <section className="md:hidden">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Sparkles size={16} className="text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900">
            {title}
          </span>
        </div>

        {isLoading ? (
          <div className="flex gap-2 overflow-hidden px-1">
            <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
          </div>
        ) : (
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {updates.map((u) => {
              const href = `/updates/${u.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={u.slug}
                  href={href}
                  className={`flex max-w-44 shrink-0 flex-col rounded-xl border px-3 py-2 text-left text-xs transition ${
                    active
                      ? "border-zinc-900 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  <span className="line-clamp-1 font-medium">
                    {getLocalized(u.title_i18n, locale)}
                  </span>
                  <span
                    className={`mt-0.5 text-[11px] ${
                      active ? "text-white/65" : "text-zinc-400"
                    }`}
                  >
                    {u.date}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </section>

      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-1 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

          <div className="flex items-center gap-2 px-3 pb-3">
            <Sparkles size={16} className="text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-900">
              {title}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-1 px-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <nav className="space-y-0.5 border-l border-zinc-200/80">
              {updates.map((u) => {
                const href = `/updates/${u.slug}`;
                const active = pathname === href;
                return (
                  <Link
                    key={u.slug}
                    href={href}
                    className={`-ml-px block border-l-2 px-3 py-2 text-[13px] leading-snug transition ${
                      active
                        ? "border-zinc-900 font-medium text-zinc-900"
                        : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                    }`}
                  >
                    <div className="line-clamp-2">{getLocalized(u.title_i18n, locale)}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {u.date}
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {children}
      </div>

    </div>
  );
}
