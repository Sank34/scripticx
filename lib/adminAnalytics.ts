import { getLocalized } from "@/lib/getLocalized";
import type { Locale } from "@/lib/i18n";

export const ANALYTICS_RANGES = [7, 30, 90] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type ProblemStatRow = {
  attempts: number;
  code: number | null;
  difficulty: string | null;
  learners: number;
  problem_id: string;
  solvers: number;
  title_i18n: Record<string, string> | null;
};

export type ActivityDayRow = {
  active_users: number;
  day: string;
  solves: number;
  submissions: number;
};

export type AdminAnalytics = {
  activity: ActivityDayRow[];
  available: boolean;
  problems: ProblemStatRow[];
};

export type PopularityPoint = {
  attempts: number;
  difficulty: string | null;
  fullLabel: string;
  href: string;
  id: string;
  label: string;
  learners: number;
  solveRate: number;
  solvers: number;
};

export type ActivityPoint = {
  activeUsers: number;
  day: string;
  dayLabel: string;
  solves: number;
  submissions: number;
};

export type ActivitySummary = {
  activeUsers: number;
  avgPerDay: number;
  deltaPct: number | null;
  peakDay: string | null;
  previousSubmissions: number;
  solveRate: number;
  solves: number;
  submissions: number;
};

const LABEL_MAX = 22;

function intlLocale(locale: Locale): string {
  return locale === "ro" ? "ro-RO" : "en-US";
}

function truncate(value: string): string {
  return value.length > LABEL_MAX ? `${value.slice(0, LABEL_MAX - 1)}…` : value;
}

function problemLabel(row: ProblemStatRow, locale: Locale): string {
  const title = String(getLocalized(row.title_i18n, locale) || "").trim();
  if (title) return title;

  return row.code === null ? "—" : `#${row.code}`;
}

export function buildPopularityData(
  rows: ProblemStatRow[] | undefined,
  locale: Locale
): PopularityPoint[] {
  if (!rows?.length) return [];

  return rows.map((row) => {
    const fullLabel = problemLabel(row, locale);

    return {
      attempts: row.attempts,
      difficulty: row.difficulty,
      fullLabel,
      href: `/admin/problems/${row.problem_id}`,
      id: row.problem_id,
      label: truncate(fullLabel),
      learners: row.learners,
      solveRate: row.learners > 0 ? row.solvers / row.learners : 0,
      solvers: row.solvers,
    };
  });
}

export function formatDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
  }).format(new Date(`${day}T00:00:00`));
}

export function buildActivitySeries(
  rows: ActivityDayRow[] | undefined,
  locale: Locale
): ActivityPoint[] {
  if (!rows?.length) return [];

  return rows.map((row) => ({
    activeUsers: row.active_users,
    day: row.day,
    dayLabel: formatDay(row.day, locale),
    solves: row.solves,
    submissions: row.submissions,
  }));
}

export function summarizeActivity(
  rows: ActivityDayRow[] | undefined
): ActivitySummary {
  if (!rows?.length) {
    return {
      activeUsers: 0,
      avgPerDay: 0,
      deltaPct: null,
      peakDay: null,
      previousSubmissions: 0,
      solveRate: 0,
      solves: 0,
      submissions: 0,
    };
  }

  const half = Math.floor(rows.length / 2);
  const previous = rows.slice(0, half);
  const current = rows.slice(half);

  const submissions = rows.reduce((sum, row) => sum + row.submissions, 0);
  const solves = rows.reduce((sum, row) => sum + row.solves, 0);

  const peak = rows.reduce((best, row) =>
    row.active_users > best.active_users ? row : best
  );

  const previousSubmissions = previous.reduce(
    (sum, row) => sum + row.submissions,
    0
  );
  const currentSubmissions = current.reduce(
    (sum, row) => sum + row.submissions,
    0
  );

  const deltaPct =
    previous.length === 0 || previousSubmissions === 0
      ? null
      : Math.round(
          ((currentSubmissions - previousSubmissions) / previousSubmissions) * 100
        );

  return {
    activeUsers: peak.active_users,
    avgPerDay: Math.round((submissions / rows.length) * 10) / 10,
    deltaPct,
    peakDay: peak.active_users > 0 ? peak.day : null,
    previousSubmissions,
    solveRate: submissions > 0 ? solves / submissions : 0,
    solves,
    submissions,
  };
}

export function hasActivity(points: ActivityPoint[]): boolean {
  return points.some((point) => point.submissions > 0);
}
