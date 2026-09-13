export const DEFAULT_SUBMISSION_ACTIVITY_MONTHS = 12 as const;
export const ACCEPTED_SUBMISSION_SCORE = 100 as const;

export type SubmissionActivitySourceRow = {
  created_at: string | null;
  problem_id: string | null;
  score: number | string | null;
};

export type SubmissionActivityAggregateRow = {
  activity_date: string | null;
  submission_count: number | string | null;
  accepted_problem_count: number | string | null;
};

export type SubmissionActivityDay = {
  date: string;
  submissions: number;
  acceptedProblems: number;
};

export type SubmissionActivityHeatmap = {
  startDate: string;
  endDate: string;
  timeZone: string;
  totalSubmissions: number;
  days: SubmissionActivityDay[];
};

export type SubmissionActivityOptions = {
  /** Inclusive YYYY-MM-DD boundary in timeZone. Defaults to today. */
  endDate?: string;
  /** Number of calendar months in the trailing window. */
  months?: number;
  /** IANA time zone used to assign timestamps to calendar days. */
  timeZone?: string;
  /** Injectable clock used only when endDate is omitted. */
  now?: Date | string | number;
  acceptedScore?: number;
};

type MutableActivityDay = {
  submissions: number;
  acceptedProblemIds: Set<string>;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(value: string) {
  const match = DATE_KEY_PATTERN.exec(value);
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

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function subtractUtcMonthsClamped(date: Date, months: number) {
  const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth() - months;
  const year = Math.floor(absoluteMonth / 12);
  const monthIndex = absoluteMonth - year * 12;
  const day = Math.min(
    date.getUTCDate(),
    daysInUtcMonth(year, monthIndex)
  );
  return new Date(Date.UTC(year, monthIndex, day));
}

function createDateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function timestampDateKey(
  value: Date | string | number,
  formatter: Intl.DateTimeFormat
) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

/**
 * Aggregates already-authorized submission rows into a dense heatmap window.
 *
 * Query code should filter to authoritative rows (currently verified_at is not
 * null) before calling this helper. Invalid rows and rows outside the requested
 * window are ignored; no submission identifiers or source code are retained.
 */
export function buildSubmissionActivityHeatmap(
  rows: readonly SubmissionActivitySourceRow[],
  options: SubmissionActivityOptions = {}
): SubmissionActivityHeatmap {
  const months = options.months ?? DEFAULT_SUBMISSION_ACTIVITY_MONTHS;
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw new RangeError("months must be an integer between 1 and 24");
  }

  const acceptedScore = options.acceptedScore ?? ACCEPTED_SUBMISSION_SCORE;
  if (!Number.isFinite(acceptedScore)) {
    throw new RangeError("acceptedScore must be finite");
  }

  const timeZone = options.timeZone || "UTC";
  const formatter = createDateFormatter(timeZone);
  const resolvedEndDate =
    options.endDate || timestampDateKey(options.now ?? new Date(), formatter);
  const end = resolvedEndDate ? parseDateKey(resolvedEndDate) : null;
  if (!end) {
    throw new RangeError("endDate must be a valid YYYY-MM-DD date");
  }

  // The matching date one year/month-window ago is exclusive, making endDate
  // inclusive while keeping the window exactly N calendar months long.
  const start = addUtcDays(subtractUtcMonthsClamped(end, months), 1);
  const daysByDate = new Map<string, MutableActivityDay>();
  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    daysByDate.set(dateKey(cursor), {
      submissions: 0,
      acceptedProblemIds: new Set<string>(),
    });
  }

  for (const row of rows) {
    if (!row.created_at) continue;
    const rowDate = timestampDateKey(row.created_at, formatter);
    if (!rowDate) continue;
    const day = daysByDate.get(rowDate);
    if (!day) continue;

    day.submissions += 1;
    const score = Number(row.score);
    const problemId = row.problem_id?.trim();
    if (problemId && Number.isFinite(score) && score >= acceptedScore) {
      day.acceptedProblemIds.add(problemId);
    }
  }

  const days = Array.from(daysByDate, ([date, day]) => ({
    date,
    submissions: day.submissions,
    acceptedProblems: day.acceptedProblemIds.size,
  }));

  return {
    startDate: dateKey(start),
    endDate: dateKey(end),
    timeZone,
    totalSubmissions: days.reduce(
      (total, day) => total + day.submissions,
      0
    ),
    days,
  };
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

/**
 * Densifies the privacy-safe daily rows returned by a database view or RPC.
 * The query contract should return at most one row per activity_date; duplicate
 * dates are combined defensively.
 */
export function buildSubmissionActivityHeatmapFromDailyRows(
  rows: readonly SubmissionActivityAggregateRow[],
  options: SubmissionActivityOptions = {}
): SubmissionActivityHeatmap {
  const empty = buildSubmissionActivityHeatmap([], options);
  const daysByDate = new Map(
    empty.days.map((day) => [day.date, { ...day }])
  );

  for (const row of rows) {
    if (!row.activity_date || !parseDateKey(row.activity_date)) continue;
    const day = daysByDate.get(row.activity_date);
    if (!day) continue;
    day.submissions += nonNegativeInteger(row.submission_count);
    day.acceptedProblems += nonNegativeInteger(
      row.accepted_problem_count
    );
  }

  const days = Array.from(daysByDate.values());
  return {
    ...empty,
    totalSubmissions: days.reduce(
      (total, day) => total + day.submissions,
      0
    ),
    days,
  };
}
