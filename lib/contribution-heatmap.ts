import type {
  SubmissionActivityDay,
  SubmissionActivityHeatmap,
} from "@/lib/submissionActivity";

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionHeatmapCell = SubmissionActivityDay & {
  column: number;
  index: number;
  level: ContributionLevel;
  row: number;
};

export type ContributionHeatmapModel = {
  activeDays: number;
  cells: readonly (ContributionHeatmapCell | null)[];
  endDate: string;
  startDate: string;
  total: number;
  weeks: readonly (readonly (ContributionHeatmapCell | null)[])[];
};

const DAY_MS = 86_400_000;

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function normalizedCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

export function resolveContributionLevel(
  submissions: number,
  maxSubmissions: number
): ContributionLevel {
  const count = normalizedCount(submissions);
  if (count === 0) return 0;
  const maximum = Math.max(1, normalizedCount(maxSubmissions));
  return Math.max(
    1,
    Math.min(4, Math.ceil((count / maximum) * 4))
  ) as ContributionLevel;
}

/** Pure rendering model without React, auth or environment dependencies. */
export function buildContributionHeatmapModel(
  data: SubmissionActivityHeatmap
): ContributionHeatmapModel {
  const start = parseDateKey(data.startDate);
  const end = parseDateKey(data.endDate);
  if (!start || !end || start > end) {
    return {
      activeDays: 0,
      cells: [],
      endDate: data.endDate,
      startDate: data.startDate,
      total: normalizedCount(data.totalSubmissions),
      weeks: [],
    };
  }

  const startDate = toDateKey(start);
  const endDate = toDateKey(end);
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const byDate = new Map<string, SubmissionActivityDay>();

  for (const item of data.days) {
    if (!parseDateKey(item.date)) continue;
    if (item.date < startDate || item.date > endDate) continue;
    const submissions = normalizedCount(item.submissions);
    const acceptedProblems = normalizedCount(item.acceptedProblems);
    const existing = byDate.get(item.date);
    if (existing) {
      byDate.set(item.date, {
        acceptedProblems: existing.acceptedProblems + acceptedProblems,
        date: item.date,
        submissions: existing.submissions + submissions,
      });
    } else {
      byDate.set(item.date, { acceptedProblems, date: item.date, submissions });
    }
  }
  const maxSubmissions = Math.max(
    0,
    ...Array.from(byDate.values(), (day) => day.submissions)
  );

  const leadingSlots = (start.getUTCDay() + 6) % 7;
  const slotCount = Math.ceil((leadingSlots + rangeDays) / 7) * 7;
  const gridStart = addDays(start, -leadingSlots);
  const cells: (ContributionHeatmapCell | null)[] = [];

  for (let index = 0; index < slotCount; index += 1) {
    const date = addDays(gridStart, index);
    const dateKey = toDateKey(date);
    if (dateKey < startDate || dateKey > endDate) {
      cells.push(null);
      continue;
    }

    const contribution = byDate.get(dateKey) || {
      acceptedProblems: 0,
      date: dateKey,
      submissions: 0,
    };
    cells.push({
      ...contribution,
      column: Math.floor(index / 7),
      index,
      level: resolveContributionLevel(contribution.submissions, maxSubmissions),
      row: index % 7,
    });
  }

  const weeks = Array.from(
    { length: cells.length / 7 },
    (_, index) => cells.slice(index * 7, index * 7 + 7)
  );
  const visibleCells = cells.filter(
    (cell): cell is ContributionHeatmapCell => Boolean(cell)
  );

  return {
    activeDays: visibleCells.filter((cell) => cell.submissions > 0).length,
    cells,
    endDate,
    startDate,
    total: normalizedCount(data.totalSubmissions),
    weeks,
  };
}
