"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Activity, CalendarDays } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  SubmissionActivityDay,
  SubmissionActivityHeatmap,
} from "@/lib/submissionActivity";
import { cn } from "@/lib/utils";

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionHeatmapProps = {
  className?: string;
  data: SubmissionActivityHeatmap;
  locale?: "en" | "ro";
  title?: ReactNode;
};

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

const levelClassNames: Record<ContributionLevel, string> = {
  0: "bg-muted/75 ring-1 ring-inset ring-border/60",
  1: "bg-chart-3/20 ring-1 ring-inset ring-chart-3/15",
  2: "bg-chart-3/40 ring-1 ring-inset ring-chart-3/20",
  3: "bg-chart-3/65 ring-1 ring-inset ring-chart-3/25",
  4: "bg-chart-3 ring-1 ring-inset ring-chart-3/30",
};

const copy = {
  en: {
    activity: "Daily submission activity",
    acceptedProblem: "accepted problem",
    acceptedProblems: "accepted problems",
    emptyDescription:
      "Daily progress will appear here after the first submitted solution.",
    emptyTitle: "No activity in this period",
    less: "Less",
    legend: "Submission intensity",
    more: "More",
    title: "Contributions",
  },
  ro: {
    activity: "Activitatea zilnică a submisiilor",
    acceptedProblem: "problemă acceptată",
    acceptedProblems: "probleme acceptate",
    emptyDescription:
      "Progresul zilnic va apărea aici după prima soluție trimisă.",
    emptyTitle: "Nicio activitate în această perioadă",
    less: "Mai puțin",
    legend: "Intensitatea submisiilor",
    more: "Mai mult",
    title: "Contribuții",
  },
} as const;

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

/** Pure rendering model built from the privacy-safe normalized activity contract. */
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

  // Monday is row zero, matching both Romanian conventions and the learning calendar.
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
      level: resolveContributionLevel(
        contribution.submissions,
        maxSubmissions
      ),
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

function submissionLabel(count: number, language: "en" | "ro") {
  if (language === "ro") {
    return `${new Intl.NumberFormat("ro-RO").format(count)} ${
      count === 1 ? "submisie" : "submisii"
    }`;
  }
  return `${new Intl.NumberFormat("en").format(count)} ${
    count === 1 ? "submission" : "submissions"
  }`;
}

function acceptedProblemsLabel(count: number, language: "en" | "ro") {
  const c = copy[language];
  return `${new Intl.NumberFormat(language === "ro" ? "ro-RO" : "en").format(count)} ${
    count === 1 ? c.acceptedProblem : c.acceptedProblems
  }`;
}

function formattedDate(date: string, language: "en" | "ro") {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(parsed);
}

function weekdayLabels(language: "en" | "ro") {
  const formatter = new Intl.DateTimeFormat(
    language === "ro" ? "ro-RO" : "en",
    { weekday: "short", timeZone: "UTC" }
  );
  // 2024-01-01 was a Monday.
  const monday = new Date(Date.UTC(2024, 0, 1));
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(addDays(monday, index)).replace(/\.$/, "")
  );
}

function monthLabel(
  week: readonly (ContributionHeatmapCell | null)[],
  language: "en" | "ro"
) {
  const day = [...week].reverse().find((cell) => cell !== null);
  if (!day) return "";
  const parsed = parseDateKey(day.date);
  if (!parsed) return "";
  return new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
    month: "short",
    timeZone: "UTC",
  })
    .format(parsed)
    .replace(/\.$/, "");
}

function monthKey(week: readonly (ContributionHeatmapCell | null)[]) {
  const lastDay = [...week].reverse().find((cell) => cell !== null);
  return lastDay?.date.slice(0, 7) || "";
}

export function ContributionHeatmap({
  className,
  data,
  locale: localeProp,
  title,
}: ContributionHeatmapProps) {
  const { locale: appLocale } = useLanguage();
  const language = localeProp || (appLocale === "ro" ? "ro" : "en");
  const c = copy[language];
  const headingId = useId();
  const descriptionId = useId();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const model = useMemo(() => buildContributionHeatmapModel(data), [data]);
  const visibleCells = useMemo(
    () =>
      model.cells.filter(
        (cell): cell is ContributionHeatmapCell => Boolean(cell)
      ),
    [model.cells]
  );
  const cellIndexByDate = useMemo(
    () => new Map(visibleCells.map((cell) => [cell.date, cell.index])),
    [visibleCells]
  );
  const [focusedDate, setFocusedDate] = useState(
    () => visibleCells.at(-1)?.date || ""
  );
  const dayLabels = useMemo(() => weekdayLabels(language), [language]);
  const monthLabels = useMemo(() => {
    let previousMonth = "";
    return model.weeks.map((week) => {
      const currentMonth = monthKey(week);
      if (!currentMonth || currentMonth === previousMonth) return "";
      previousMonth = currentMonth;
      return monthLabel(week, language);
    });
  }, [language, model.weeks]);

  useEffect(() => {
    const lastDate = visibleCells.at(-1)?.date || "";
    if (!cellIndexByDate.has(focusedDate)) setFocusedDate(lastDate);
  }, [cellIndexByDate, focusedDate, visibleCells]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth;
  }, [model.endDate, model.weeks.length]);

  function focusCell(target: ContributionHeatmapCell | null | undefined) {
    if (!target) return;
    setFocusedDate(target.date);
    buttonRefs.current.get(target.date)?.focus();
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    cell: ContributionHeatmapCell
  ) {
    let target: ContributionHeatmapCell | null | undefined;
    if (event.key === "ArrowLeft") {
      target = model.weeks[cell.column - 1]?.[cell.row];
    }
    if (event.key === "ArrowRight") {
      target = model.weeks[cell.column + 1]?.[cell.row];
    }
    if (event.key === "ArrowUp") {
      target = model.weeks[cell.column]?.[cell.row - 1];
    }
    if (event.key === "ArrowDown") {
      target = model.weeks[cell.column]?.[cell.row + 1];
    }
    if (event.key === "Home") {
      target = model.weeks
        .map((week) => week[cell.row])
        .find((candidate) => Boolean(candidate));
    }
    if (event.key === "End") {
      target = model.weeks
        .map((week) => week[cell.row])
        .reverse()
        .find((candidate) => Boolean(candidate));
    }
    if (!target) return;
    event.preventDefault();
    focusCell(target);
  }

  const gridStyle = {
    gridAutoColumns: "var(--heatmap-cell)",
    gridTemplateRows: "repeat(7, var(--heatmap-cell))",
  } as CSSProperties;
  const monthStyle = {
    gridTemplateColumns: `repeat(${model.weeks.length}, var(--heatmap-cell))`,
  } as CSSProperties;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card/95 text-card-foreground shadow-sm supports-[backdrop-filter]:backdrop-blur-sm",
        className
      )}
    >
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chart-3/12 text-chart-3 ring-1 ring-inset ring-chart-3/15">
            <Activity className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-base font-semibold">
              {title || c.title}
            </h2>
            <p
              id={descriptionId}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {c.activity}
            </p>
          </div>
        </div>
        <div className="self-start rounded-full border bg-background px-3 py-1.5 text-xs font-medium tabular-nums sm:self-auto">
          {submissionLabel(model.total, language)}
        </div>
      </header>

      {model.total === 0 ? (
        <div
          role="status"
          className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-3.5 py-3 text-left sm:mx-5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{c.emptyTitle}</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {c.emptyDescription}
            </span>
          </span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden px-4 pb-3 pt-4 [scrollbar-width:thin] sm:px-5"
      >
        <div className="w-max [--heatmap-cell:0.72rem] sm:[--heatmap-cell:0.8rem]">
          <div className="ml-10 grid gap-1" style={monthStyle} aria-hidden="true">
            {monthLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="h-4 overflow-visible whitespace-nowrap text-[10px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-[2.25rem_auto] gap-1">
            <div
              className="grid grid-rows-[repeat(7,var(--heatmap-cell))] gap-1 text-[9px] text-muted-foreground"
              aria-hidden="true"
            >
              {dayLabels.map((label, index) => (
                <span
                  key={label}
                  className="flex items-center"
                >
                  {index === 0 || index === 2 || index === 4 ? label : ""}
                </span>
              ))}
            </div>

            <TooltipProvider delayDuration={120} skipDelayDuration={80}>
              <div
                role="grid"
                aria-colcount={model.weeks.length}
                aria-describedby={descriptionId}
                aria-label={c.activity}
                aria-rowcount={7}
                className="grid grid-flow-col gap-1"
                style={gridStyle}
              >
                {model.cells.map((cell, index) =>
                  cell ? (
                    <Tooltip key={cell.date}>
                      <TooltipTrigger asChild>
                        <button
                          ref={(node) => {
                            if (node) buttonRefs.current.set(cell.date, node);
                            else buttonRefs.current.delete(cell.date);
                          }}
                          type="button"
                          role="gridcell"
                          aria-colindex={cell.column + 1}
                          aria-label={`${formattedDate(cell.date, language)}: ${submissionLabel(cell.submissions, language)}, ${acceptedProblemsLabel(cell.acceptedProblems, language)}`}
                          aria-rowindex={cell.row + 1}
                          className={cn(
                            "size-[var(--heatmap-cell)] rounded-[3px] outline-none transition-transform hover:-translate-y-px hover:ring-2 hover:ring-ring/35 focus-visible:z-10 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                            levelClassNames[cell.level]
                          )}
                          onFocus={() => setFocusedDate(cell.date)}
                          onKeyDown={(event) => handleCellKeyDown(event, cell)}
                          tabIndex={
                            focusedDate === cell.date ||
                            (!focusedDate && index === model.cells.length - 1)
                              ? 0
                              : -1
                          }
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={7}
                        className="flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">
                          {formattedDate(cell.date, language)}
                        </span>
                        <span className="text-background/70">
                          {submissionLabel(cell.submissions, language)}
                        </span>
                        <span className="text-background/70">
                          {acceptedProblemsLabel(
                            cell.acceptedProblems,
                            language
                          )}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span key={`empty-${index}`} aria-hidden="true" />
                  )
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground sm:px-5">
        <span>
          {model.activeDays} {language === "ro" ? "zile active" : "active days"}
        </span>
        <div
          className="flex items-center gap-1.5"
          aria-label={c.legend}
          role="img"
        >
          <span>{c.less}</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-[3px]",
                levelClassNames[level]
              )}
            />
          ))}
          <span>{c.more}</span>
        </div>
      </footer>
    </section>
  );
}
