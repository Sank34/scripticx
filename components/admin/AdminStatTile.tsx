"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AdminStatTileProps = {
  footer: ReactNode;
  icon: ReactNode;
  label: string;
  pending: boolean;
  value: ReactNode;
  valueClassName?: string;
};

export function AdminStatTile({
  footer,
  icon,
  label,
  pending,
  value,
  valueClassName,
}: AdminStatTileProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      <div className="flex-1 space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon}
        </div>

        {pending ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className={cn("text-3xl font-bold tracking-tight", valueClassName)}>
            {value}
          </p>
        )}
      </div>

      <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        {pending ? <Skeleton className="h-3 w-28" /> : footer}
      </div>
    </div>
  );
}
