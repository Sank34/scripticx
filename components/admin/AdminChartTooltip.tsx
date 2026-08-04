"use client";

import type { ReactNode } from "react";

export type ChartTooltipRow = {
  color?: string;
  label: string;
  value: ReactNode;
};

type AdminChartTooltipProps = {
  rows: ChartTooltipRow[];
  title: string;
};

export function AdminChartTooltip({ rows, title }: AdminChartTooltipProps) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1.5 text-xs font-medium">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            {row.color && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
