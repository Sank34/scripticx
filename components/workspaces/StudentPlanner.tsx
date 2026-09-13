"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { enUS, ro as roLocale } from "date-fns/locale";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FolderKanban,
  ListFilter,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PlannerItemDialog } from "@/components/workspaces/PlannerItemDialog";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  createPlannerEvent,
  createPlannerProject,
  deletePlannerEvent,
  deletePlannerProject,
  getPlannerRange,
  loadStudentPlanner,
  updatePlannerEvent,
  updatePlannerProject,
  type PlannerColor,
  type PlannerEventInput,
  type PlannerFilter,
  type PlannerProjectInput,
  type StudentPlannerItem,
} from "@/lib/student-planner";
import { cn } from "@/lib/utils";

type PlannerView = "agenda" | "month";

const colorStyles: Record<
  PlannerColor,
  { dot: string; item: string; soft: string }
> = {
  sky: {
    dot: "bg-sky-500",
    item: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  violet: {
    dot: "bg-violet-500",
    item:
      "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  amber: {
    dot: "bg-amber-500",
    item:
      "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  rose: {
    dot: "bg-rose-500",
    item: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  emerald: {
    dot: "bg-emerald-500",
    item:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  slate: {
    dot: "bg-slate-500",
    item:
      "border-slate-500/25 bg-slate-500/10 text-slate-800 dark:text-slate-200",
    soft: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
};

function itemOverlapsDay(item: StudentPlannerItem, day: Date) {
  return (
    new Date(item.startsAt) <= endOfDay(day) &&
    new Date(item.endsAt) >= startOfDay(day)
  );
}

function itemTime(item: StudentPlannerItem, locale: "en" | "ro") {
  if (item.allDay) return locale === "ro" ? "Toată ziua" : "All day";
  return format(new Date(item.startsAt), "HH:mm");
}

function PlannerItemIcon({ source }: { source: StudentPlannerItem["source"] }) {
  if (source === "assignment") return <BookOpenCheck className="size-4" />;
  if (source === "project") return <FolderKanban className="size-4" />;
  return <CalendarDays className="size-4" />;
}

function PlannerListItem({
  item,
  locale,
  onOpen,
}: {
  item: StudentPlannerItem;
  locale: "en" | "ro";
  onOpen: (item: StudentPlannerItem) => void;
}) {
  const ro = locale === "ro";
  const dateLocale = ro ? roLocale : enUS;
  const overdue = item.status === "overdue";
  const completed = item.status === "completed";

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
          colorStyles[item.color].soft
        )}
      >
        <PlannerItemIcon source={item.source} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "line-clamp-2 text-sm font-medium",
              completed && "text-muted-foreground line-through"
            )}
          >
            {item.title}
          </span>
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </span>
        <span
          className={cn(
            "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
            overdue && "text-destructive"
          )}
        >
          <span>
            {format(new Date(item.startsAt), "EEE, d MMM", {
              locale: dateLocale,
            })}
          </span>
          <span aria-hidden>·</span>
          <span>{itemTime(item, locale)}</span>
          {item.className && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{item.className}</span>
            </>
          )}
        </span>
        {item.progress !== null && (
          <span className="mt-2 flex items-center gap-2">
            <Progress value={item.progress} className="max-w-28" />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {item.progress}%
            </span>
          </span>
        )}
      </span>
      <span className="sr-only">
        {item.editable
          ? ro
            ? "Editează"
            : "Edit"
          : ro
            ? "Deschide tema"
            : "Open assignment"}
      </span>
    </button>
  );
}

export function StudentPlanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const language = locale === "ro" ? "ro" : "en";
  const ro = language === "ro";
  const dateLocale = ro ? roLocale : enUS;
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<PlannerView>("month");
  const [filter, setFilter] = useState<PlannerFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState(() => new Date());
  const [activeItem, setActiveItem] = useState<StudentPlannerItem | null>(null);
  const range = useMemo(() => getPlannerRange(month), [month]);
  const queryKey = [
    "student-planner",
    user?.id,
    range.start.toISOString(),
    range.end.toISOString(),
  ] as const;

  const plannerQuery = useQuery({
    queryKey,
    queryFn: () =>
      loadStudentPlanner({
        userId: user!.id,
        start: range.start,
        end: range.end,
      }),
    enabled: Boolean(user?.id),
  });

  const filteredItems = useMemo(() => {
    const items = plannerQuery.data?.items || [];
    return filter === "all"
      ? items
      : items.filter((item) => item.source === filter);
  }, [filter, plannerQuery.data?.items]);

  const visibleDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  );
  const weekDays = visibleDays.slice(0, 7);
  const agendaGroups = useMemo(
    () =>
      visibleDays
        .map((day) => ({
          day,
          items: filteredItems.filter((item) => itemOverlapsDay(item, day)),
        }))
        .filter((group) => group.items.length > 0),
    [filteredItems, visibleDays]
  );
  const upcoming = filteredItems
    .filter(
      (item) =>
        new Date(item.endsAt) >= startOfDay(new Date()) &&
        item.status !== "completed"
    )
    .slice(0, 8);
  const monthItems = filteredItems.filter((item) =>
    isSameMonth(new Date(item.startsAt), month)
  );
  const completedCount = monthItems.filter(
    (item) => item.status === "completed"
  ).length;
  const overdueCount = monthItems.filter(
    (item) => item.status === "overdue"
  ).length;

  function openCreate(date = new Date()) {
    setActiveItem(null);
    setDialogDate(date);
    setDialogOpen(true);
  }

  function openItem(item: StudentPlannerItem) {
    if (item.href) {
      router.push(item.href);
      return;
    }
    setActiveItem(item);
    setDialogDate(new Date(item.startsAt));
    setDialogOpen(true);
  }

  async function refreshPlanner() {
    await queryClient.invalidateQueries({ queryKey: ["student-planner"] });
  }

  function reportError(error: unknown) {
    toast.error(ro ? "Planner-ul nu a putut fi actualizat." : "Planner could not be updated.", {
      description: error instanceof Error ? error.message : String(error),
    });
  }

  async function saveEvent(
    input: PlannerEventInput,
    existing: StudentPlannerItem | null
  ) {
    if (!user) return;
    try {
      if (existing) await updatePlannerEvent(user.id, existing.id, input);
      else await createPlannerEvent(user.id, input);
      await refreshPlanner();
      toast.success(
        existing
          ? ro
            ? "Eveniment actualizat."
            : "Event updated."
          : ro
            ? "Eveniment adăugat."
            : "Event added."
      );
    } catch (error) {
      reportError(error);
      throw error;
    }
  }

  async function saveProject(
    input: PlannerProjectInput,
    existing: StudentPlannerItem | null
  ) {
    if (!user) return;
    try {
      if (existing) await updatePlannerProject(user.id, existing.id, input);
      else await createPlannerProject(user.id, input);
      await refreshPlanner();
      toast.success(
        existing
          ? ro
            ? "Proiect actualizat."
            : "Project updated."
          : ro
            ? "Proiect adăugat."
            : "Project added."
      );
    } catch (error) {
      reportError(error);
      throw error;
    }
  }

  async function deleteItem(item: StudentPlannerItem) {
    if (!user || !item.editable) return;
    try {
      if (item.source === "event") {
        await deletePlannerEvent(user.id, item.id);
      } else if (item.source === "project") {
        await deletePlannerProject(user.id, item.id);
      }
      await refreshPlanner();
      toast.success(ro ? "Element șters din Planner." : "Item removed from Planner.");
    } catch (error) {
      reportError(error);
      throw error;
    }
  }

  const filterOptions: Array<{
    value: PlannerFilter;
    label: string;
  }> = [
    { value: "all", label: ro ? "Toate" : "All" },
    { value: "event", label: ro ? "Evenimente" : "Events" },
    { value: "assignment", label: ro ? "Teme" : "Assignments" },
    { value: "project", label: ro ? "Proiecte" : "Projects" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <CalendarDays className="size-4.5" strokeWidth={1.8} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Planner</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {ro
                  ? "Teme, proiecte și planurile tale într-un singur loc."
                  : "Assignments, projects, and your own plans in one place."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(value) => setView(value as PlannerView)}>
              <TabsList>
                <TabsTrigger value="month">{ro ? "Lună" : "Month"}</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => openCreate()}>
              <Plus className="size-4" />
              {ro ? "Adaugă" : "Add"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={ro ? "Luna anterioară" : "Previous month"}
              onClick={() => setMonth((current) => subMonths(current, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={ro ? "Luna următoare" : "Next month"}
              onClick={() => setMonth((current) => addMonths(current, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              {ro ? "Astăzi" : "Today"}
            </Button>
            <h2 className="ml-1 text-lg font-semibold capitalize sm:text-xl">
              {format(month, "MMMM yyyy", { locale: dateLocale })}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ListFilter className="mr-1 size-4 text-muted-foreground" />
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filter === option.value ? "secondary" : "ghost"}
                onClick={() => setFilter(option.value)}
                className="rounded-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {plannerQuery.isPending ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-[680px] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          </div>
        ) : plannerQuery.isError ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
            <CircleAlert className="size-8 text-destructive" />
            <h2 className="mt-4 font-semibold">
              {ro ? "Planner-ul nu s-a putut încărca" : "Planner could not load"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {plannerQuery.error instanceof Error
                ? plannerQuery.error.message
                : ro
                  ? "Încearcă din nou în câteva momente."
                  : "Try again in a moment."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void plannerQuery.refetch()}
            >
              <RotateCcw className="size-4" />
              {ro ? "Reîncearcă" : "Retry"}
            </Button>
          </div>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0">
              {view === "month" ? (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 border-b bg-muted/25">
                      {weekDays.map((day) => (
                        <div
                          key={day.toISOString()}
                          className="px-3 py-2.5 text-xs font-medium capitalize text-muted-foreground"
                        >
                          {format(day, "EEE", { locale: dateLocale })}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {visibleDays.map((day, index) => {
                        const dayItems = filteredItems.filter((item) =>
                          itemOverlapsDay(item, day)
                        );
                        const outside = !isSameMonth(day, month);

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "group/day relative min-h-28 border-b border-r p-2 transition-colors hover:bg-muted/20",
                              index % 7 === 6 && "border-r-0",
                              index >= visibleDays.length - 7 && "border-b-0",
                              outside && "bg-muted/15"
                            )}
                          >
                            <button
                              type="button"
                              className="absolute inset-0 z-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                              aria-label={`${ro ? "Adaugă în" : "Add to"} ${format(day, "PPP", { locale: dateLocale })}`}
                              onClick={() => openCreate(day)}
                            />
                            <div className="relative z-[1] pointer-events-none mb-2 flex items-center justify-between">
                              <span
                                className={cn(
                                  "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                                  outside && "text-muted-foreground/60",
                                  isToday(day) && "bg-foreground text-background"
                                )}
                              >
                                {format(day, "d")}
                              </span>
                              {dayItems.length > 0 && (
                                <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 transition group-hover/day:opacity-100">
                                  {dayItems.length}
                                </span>
                              )}
                            </div>
                            <div className="relative z-[2] space-y-1">
                              {dayItems.slice(0, 3).map((item) => (
                                <button
                                  key={`${item.source}:${item.id}`}
                                  type="button"
                                  onClick={() => openItem(item)}
                                  className={cn(
                                    "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] leading-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    colorStyles[item.color].item,
                                    item.status === "completed" && "opacity-60"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full",
                                      colorStyles[item.color].dot
                                    )}
                                  />
                                  {!item.allDay && (
                                    <span className="shrink-0 tabular-nums opacity-70">
                                      {itemTime(item, language)}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "truncate font-medium",
                                      item.status === "completed" && "line-through"
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                </button>
                              ))}
                              {dayItems.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setView("agenda")}
                                  className="px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                >
                                  +{dayItems.length - 3} {ro ? "mai multe" : "more"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  {agendaGroups.map((group) => (
                      <section
                        key={group.day.toISOString()}
                        className="grid border-b last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)]"
                      >
                        <div className="border-b bg-muted/20 px-4 py-4 sm:border-b-0 sm:border-r">
                          <p className="text-xs font-medium capitalize text-muted-foreground">
                            {format(group.day, "EEEE", { locale: dateLocale })}
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {format(group.day, "d")}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {format(group.day, "MMMM", { locale: dateLocale })}
                          </p>
                        </div>
                        <div className="divide-y px-2 py-1">
                          {group.items.map((item) => (
                            <PlannerListItem
                              key={`${item.source}:${item.id}`}
                              item={item}
                              locale={language}
                              onOpen={openItem}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  {agendaGroups.length === 0 && (
                    <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
                      <CalendarDays className="size-8 text-muted-foreground/50" />
                      <p className="mt-3 font-medium">
                        {ro ? "Luna aceasta este liberă" : "This month is clear"}
                      </p>
                      <Button className="mt-4" size="sm" onClick={() => openCreate()}>
                        <Plus className="size-4" />
                        {ro ? "Adaugă primul plan" : "Add your first plan"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </main>

            <aside className="space-y-4 xl:sticky xl:top-4">
              <section className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-none">
                <div className="p-5">
                  <div>
                    <div className="flex items-center justify-end gap-3">
                      <Badge variant="secondary">
                        {format(new Date(), "d MMM", { locale: dateLocale })}
                      </Badge>
                    </div>
                    <p className="mt-5 text-sm text-muted-foreground">
                      {ro ? "Luna aceasta" : "This month"}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-2xl font-semibold tabular-nums">
                          {monthItems.length}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ro ? "planuri" : "plans"}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {completedCount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ro ? "gata" : "done"}
                        </p>
                      </div>
                      <div>
                        <p className={cn("text-2xl font-semibold tabular-nums", overdueCount > 0 && "text-destructive")}>
                          {overdueCount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ro ? "întârziate" : "overdue"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3.5">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {ro ? "Urmează" : "Up next"}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ro ? "Deadline-uri și evenimente" : "Deadlines and events"}
                    </p>
                  </div>
                  <Clock3 className="size-4 text-muted-foreground" />
                </div>
                <div className="divide-y px-1 py-1">
                  {upcoming.length ? (
                    upcoming.map((item) => (
                      <PlannerListItem
                        key={`${item.source}:${item.id}`}
                        item={item}
                        locale={language}
                        onOpen={openItem}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center px-4 py-8 text-center">
                      <CheckCircle2 className="size-7 text-emerald-500" />
                      <p className="mt-3 text-sm font-medium">
                        {ro ? "Nimic urgent" : "Nothing urgent"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ro
                          ? "Poți adăuga un eveniment personal."
                          : "You can add a personal event."}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
                {[
                  { color: "bg-sky-500", label: ro ? "Eveniment" : "Event" },
                  { color: "bg-amber-500", label: ro ? "Temă" : "Assignment" },
                  { color: "bg-violet-500", label: ro ? "Proiect" : "Project" },
                ].map((legend) => (
                  <span key={legend.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", legend.color)} />
                    {legend.label}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>

      <PlannerItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={dialogDate}
        item={activeItem}
        locale={language}
        onSaveEvent={saveEvent}
        onSaveProject={saveProject}
        onDelete={deleteItem}
      />
    </div>
  );
}
