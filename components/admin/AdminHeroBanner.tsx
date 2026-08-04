"use client";

import type { ReactNode } from "react";

type AdminHeroBannerProps = {
  action?: ReactNode;
  subtitle: string;
  title: string;
};

export function AdminHeroBanner({ action, subtitle, title }: AdminHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-950 px-6 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(120%_120%_at_85%_20%,rgba(56,135,229,0.55),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-1/2 h-64 w-[36rem] -translate-y-1/2 -rotate-12 bg-[linear-gradient(90deg,transparent,rgba(120,190,255,0.18),transparent)] blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{subtitle}</p>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
