"use client";

import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  boxShadow: "0 12px 30px rgb(0 0 0 / 0.18)",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
  padding: "0.625rem 0.75rem",
};

const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
  marginBottom: "0.25rem",
};

const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--popover-foreground)",
  padding: 0,
};

type ScorePoint = { name: string; score: number };
type ScoreBucket = { color: string; name: string; value: number };

export function DashboardCharts({
  emptyLabel,
  locale,
  scoreDistribution,
  scoreTrend,
}: {
  emptyLabel: string;
  locale: string;
  scoreDistribution: ScoreBucket[];
  scoreTrend: ScorePoint[];
}) {
  const hasScoreDistribution = scoreDistribution.some((item) => item.value > 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {locale === "ro" ? "Evoluția scorurilor" : "Score trend"}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {locale === "ro" ? "ultimele rezultate" : "latest results"}
          </span>
        </CardHeader>
        <CardContent>
          {scoreTrend.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    cursor={{
                      stroke: "var(--muted-foreground)",
                      strokeOpacity: 0.45,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState className="py-10" title={emptyLabel} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ro" ? "Distribuția rezultatelor" : "Result mix"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[180px_1fr] xl:grid-cols-1">
          <div className="h-44">
            {hasScoreDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {scoreDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState className="py-8" title={emptyLabel} />
            )}
          </div>
          <div className="space-y-2">
            {scoreDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
