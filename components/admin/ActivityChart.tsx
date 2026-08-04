"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/components/LanguageProvider";
import { AdminChartTooltip } from "@/components/admin/AdminChartTooltip";
import type { ActivityPoint } from "@/lib/adminAnalytics";

const SUBMISSIONS_COLOR = "var(--color-chart-1)";
const USERS_COLOR = "var(--color-chart-2)";

type ActivityChartProps = {
  data: ActivityPoint[];
};

export function ActivityChart({ data }: ActivityChartProps) {
  const { t } = useLanguage();

  const submissionsLabel = t("admin.overview.analytics.metrics.submissions");
  const usersLabel = t("admin.overview.analytics.metrics.activeUsers");

  function renderTooltip(props: { active?: boolean; payload?: any }) {
    const point = props.payload?.[0]?.payload as ActivityPoint | undefined;
    if (!props.active || !point) return null;

    return (
      <AdminChartTooltip
        title={point.dayLabel}
        rows={[
          {
            color: SUBMISSIONS_COLOR,
            label: submissionsLabel,
            value: point.submissions.toLocaleString(),
          },
          {
            color: USERS_COLOR,
            label: usersLabel,
            value: point.activeUsers.toLocaleString(),
          },
          {
            label: t("admin.overview.analytics.metrics.solves"),
            value: point.solves.toLocaleString(),
          },
        ]}
      />
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ bottom: 0, left: 0, right: 8, top: 4 }}>
          <defs>
            <linearGradient id="adminSubmissionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SUBMISSIONS_COLOR} stopOpacity={0.28} />
              <stop offset="95%" stopColor={SUBMISSIONS_COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="adminActiveUsersFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={USERS_COLOR} stopOpacity={0.22} />
              <stop offset="95%" stopColor={USERS_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="dayLabel"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            width={36}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip content={renderTooltip} cursor={{ stroke: "var(--border)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />

          <Area
            type="monotone"
            dataKey="submissions"
            name={submissionsLabel}
            stroke={SUBMISSIONS_COLOR}
            strokeWidth={2}
            fill="url(#adminSubmissionsFill)"
          />
          <Area
            type="monotone"
            dataKey="activeUsers"
            name={usersLabel}
            stroke={USERS_COLOR}
            strokeWidth={2}
            fill="url(#adminActiveUsersFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
