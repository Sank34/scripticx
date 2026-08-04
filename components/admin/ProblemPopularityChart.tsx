"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/components/LanguageProvider";
import { AdminChartTooltip } from "@/components/admin/AdminChartTooltip";
import type { PopularityPoint } from "@/lib/adminAnalytics";

const SERIES_COLOR = "var(--color-chart-1)";
const ROW_HEIGHT = 30;
const MIN_HEIGHT = 180;

type ProblemPopularityChartProps = {
  data: PopularityPoint[];
};

export function ProblemPopularityChart({ data }: ProblemPopularityChartProps) {
  const { t } = useLanguage();

  const percent = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    style: "percent",
  });

  function renderTooltip(props: { active?: boolean; payload?: any }) {
    const point = props.payload?.[0]?.payload as PopularityPoint | undefined;
    if (!props.active || !point) return null;

    return (
      <AdminChartTooltip
        title={point.fullLabel}
        rows={[
          {
            color: SERIES_COLOR,
            label: t("admin.overview.analytics.metrics.attempts"),
            value: point.attempts.toLocaleString(),
          },
          {
            label: t("admin.overview.analytics.metrics.learners"),
            value: point.learners.toLocaleString(),
          },
          {
            label: t("admin.overview.analytics.metrics.solveRate"),
            value: percent.format(point.solveRate),
          },
        ]}
      />
    );
  }

  return (
    <div style={{ height: Math.max(data.length * ROW_HEIGHT + 24, MIN_HEIGHT) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ bottom: 0, left: 0, right: 44, top: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar dataKey="attempts" fill={SERIES_COLOR} radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="attempts"
              position="right"
              offset={8}
              fill="var(--muted-foreground)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
