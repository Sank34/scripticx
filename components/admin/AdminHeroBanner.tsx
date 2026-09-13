"use client";

import type { ReactNode } from "react";

type AdminHeroBannerProps = {
  action?: ReactNode;
  subtitle: string;
  title: string;
};

export function AdminHeroBanner({ action, subtitle, title }: AdminHeroBannerProps) {
  return (
    <div className="overflow-hidden rounded-[var(--sx-radius-panel)] border border-foreground/10 bg-foreground px-6 py-8 text-background shadow-sm sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-background/70">{subtitle}</p>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
