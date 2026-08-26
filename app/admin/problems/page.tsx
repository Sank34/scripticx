"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ExternalLink,
  FileCode2,
  FlaskConical,
  Languages,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ProblemForm } from "@/components/admin/ProblemForm";
import { EmptyState } from "@/components/common/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/common/PageHeader";
import RouteGuard from "@/components/RouteGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type DailyChallenge } from "@/lib/api";
import { getLocalized } from "@/lib/getLocalized";
import { markdownPreview } from "@/lib/markdownPreview";
import { supabase } from "@/lib/supabase";

type AdminProblem = {
  code: number | string | null;
  created_at?: string | null;
  description_i18n: Record<string, string> | null;
  difficulty: string | null;
  id: string;
  starter_code?: string | null;
  test_cases?: unknown;
  title_i18n: Record<string, string> | null;
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function AdminProblemsContent() {
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const todayKey = api.dailyChallenges.getTodayKey();
  const ro = locale === "ro";
  const copy = ro
    ? {
        subtitle: "Creează enunțuri clare, configurează evaluarea și programează provocările zilnice.",
        library: "Biblioteca de probleme",
        libraryDescription: "Caută, verifică și deschide configuratorul unei probleme.",
        search: "Caută după titlu, cod sau descriere...",
        allDifficulties: "Toate dificultățile",
        daily: "Provocarea zilnică",
        dailyDescription: "Alege problema care va apărea în dashboard-ul utilizatorilor.",
        chooseProblem: "Alege problema",
        bonus: "Puncte bonus",
        schedule: "Programează",
        scheduling: "Se programează...",
        scheduled: "Programări viitoare",
        active: "Activă",
        inactive: "Inactivă",
        empty: "Nu există probleme care corespund filtrelor.",
        tests: "teste",
        translations: "traduceri",
        openPublic: "Deschide pagina publică",
        scheduleSuccess: "Provocarea zilnică a fost programată.",
        scheduleError: "Provocarea zilnică nu a putut fi programată.",
        selectFirst: "Selectează mai întâi o problemă.",
        futureOnly: "Provocările pot fi programate începând de astăzi.",
        loadingError: "Problemele nu au putut fi încărcate.",
        retry: "Încearcă din nou",
        clearFilters: "Resetează filtrele",
      }
    : {
        subtitle: "Create clear statements, configure evaluation, and schedule daily challenges.",
        library: "Problem library",
        libraryDescription: "Search, review, and open the configurator for any problem.",
        search: "Search by title, code, or description...",
        allDifficulties: "All difficulties",
        daily: "Daily challenge",
        dailyDescription: "Choose the problem shown in user dashboards for a specific day.",
        chooseProblem: "Choose problem",
        bonus: "Bonus points",
        schedule: "Schedule",
        scheduling: "Scheduling...",
        scheduled: "Upcoming schedule",
        active: "Active",
        inactive: "Inactive",
        empty: "No problems match the current filters.",
        tests: "tests",
        translations: "translations",
        openPublic: "Open public page",
        scheduleSuccess: "Daily challenge scheduled.",
        scheduleError: "The daily challenge could not be scheduled.",
        selectFirst: "Select a problem first.",
        futureOnly: "Daily challenges can be scheduled from today onward.",
        loadingError: "Problems could not be loaded.",
        retry: "Try again",
        clearFilters: "Clear filters",
      };

  const [schedulingDaily, setSchedulingDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState(todayKey);
  const [dailyProblemId, setDailyProblemId] = useState("");
  const [dailyBonusPoints, setDailyBonusPoints] = useState(25);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const adminProblemsQueryKey = ["admin", "problems"] as const;

  const problemsQuery = useQuery({
    queryKey: adminProblemsQueryKey,
    queryFn: async () => {
      const [{ data: problemRows, error }, scheduled] = await Promise.all([
        supabase.from("problems").select("*").order("created_at", { ascending: false }),
        api.dailyChallenges.list(90),
      ]);
      if (error) throw error;
      return {
        problems: (problemRows || []) as AdminProblem[],
        dailyChallenges: scheduled,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const problems = useMemo(() => problemsQuery.data?.problems || [], [problemsQuery.data?.problems]);
  const dailyChallenges: DailyChallenge[] = problemsQuery.data?.dailyChallenges || [];
  const scheduledDateKeys = new Set(
    dailyChallenges.filter((challenge) => challenge.is_active).map((challenge) => challenge.challenge_date)
  );
  const filteredProblems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale);
    return problems.filter((problem) => {
      const title = getLocalized(problem.title_i18n, locale);
      const description = getLocalized(problem.description_i18n, locale);
      const matchesSearch = !needle || `${problem.code ?? ""} ${title} ${description}`.toLocaleLowerCase(locale).includes(needle);
      const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [difficulty, locale, problems, search]);

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("problems").delete().eq("id", deleteId);
    if (error) {
      toast.error(t("admin.problems.toast.deleteError"));
      return;
    }
    queryClient.setQueryData<typeof problemsQuery.data>(adminProblemsQueryKey, (current) =>
      current ? { ...current, problems: current.problems.filter((problem) => problem.id !== deleteId) } : current
    );
    void queryClient.invalidateQueries({ queryKey: ["problems"] });
    setDeleteId(null);
    toast.success(t("admin.problems.toast.deleted"));
  }

  async function handleScheduleDailyChallenge() {
    if (!dailyProblemId) {
      toast.error(copy.selectFirst);
      return;
    }
    if (dailyDate < todayKey) {
      setDailyDate(todayKey);
      toast.error(copy.futureOnly);
      return;
    }
    setSchedulingDaily(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Missing user");
      await api.dailyChallenges.schedule({
        date: dailyDate,
        problemId: dailyProblemId,
        bonusPoints: dailyBonusPoints,
        createdBy: user.id,
      });
      await queryClient.invalidateQueries({ queryKey: adminProblemsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["daily-challenge"] });
      toast.success(copy.scheduleSuccess);
    } catch {
      toast.error(copy.scheduleError);
    } finally {
      setSchedulingDaily(false);
    }
  }

  return (
    <main className="sx-page space-y-8 pb-16">
      <PageHeader
        title={t("admin.problems.manageTitle")}
        subtitle={copy.subtitle}
        meta={<Badge variant="secondary">{problems.length}</Badge>}
        action={(
          <Button onClick={() => setOpenCreate(true)}>
            <Plus />
            {t("admin.problems.create")}
          </Button>
        )}
      />

      <section className="sx-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">{copy.daily}</h2>
              <Badge variant="outline">{dailyChallenges.length}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{copy.dailyDescription}</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-[190px_minmax(260px,1fr)_150px_auto]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal">
                <CalendarDays className="text-muted-foreground" />
                {parseDateKey(dailyDate).toLocaleDateString(ro ? "ro-RO" : "en-US")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parseDateKey(dailyDate)}
                modifiers={{ scheduled: (date) => scheduledDateKeys.has(formatDateKey(date)) }}
                modifiersClassNames={{ scheduled: "bg-[var(--sx-success-soft)] font-semibold text-foreground" }}
                disabled={(date) => formatDateKey(date) < todayKey}
                onSelect={(date) => {
                  if (!date) return;
                  const dateKey = formatDateKey(date);
                  if (dateKey >= todayKey) setDailyDate(dateKey);
                }}
              />
            </PopoverContent>
          </Popover>
          <Select value={dailyProblemId} onValueChange={setDailyProblemId}>
            <SelectTrigger><SelectValue placeholder={copy.chooseProblem} /></SelectTrigger>
            <SelectContent>
              {problems.map((problem) => (
                <SelectItem key={problem.id} value={problem.id}>
                  {problem.code != null ? `#${problem.code} ` : ""}{getLocalized(problem.title_i18n, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="relative">
            <span className="sr-only">{copy.bonus}</span>
            <Input
              className="pr-10"
              min={0}
              type="number"
              value={dailyBonusPoints}
              onChange={(event) => setDailyBonusPoints(Number(event.target.value))}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">pts</span>
          </label>
          <Button onClick={() => void handleScheduleDailyChallenge()} disabled={schedulingDaily}>
            {schedulingDaily ? copy.scheduling : copy.schedule}
          </Button>
        </div>
        {dailyChallenges.length > 0 && (
          <div className="border-t bg-muted/20 px-5 py-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">{copy.scheduled}</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {dailyChallenges.slice(0, 6).map((challenge) => (
                <div key={challenge.id} className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--sx-radius-control)] border bg-background px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getLocalized(challenge.problems?.title_i18n, locale)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{challenge.challenge_date} · +{challenge.bonus_points || 0} pts</p>
                  </div>
                  <Badge variant={challenge.is_active ? "secondary" : "outline"}>{challenge.is_active ? copy.active : copy.inactive}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{copy.library}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.libraryDescription}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(240px,360px)_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
            </label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allDifficulties}</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {problemsQuery.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-[var(--sx-radius-card)]" />)}
          </div>
        ) : problemsQuery.isError ? (
          <EmptyState
            icon={<FileCode2 className="size-6" />}
            title={copy.loadingError}
            action={<Button variant="outline" onClick={() => void problemsQuery.refetch()}>{copy.retry}</Button>}
          />
        ) : filteredProblems.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={copy.empty}
            action={(search || difficulty !== "all") ? <Button variant="outline" onClick={() => { setSearch(""); setDifficulty("all"); }}>{copy.clearFilters}</Button> : undefined}
          />
        ) : (
          <div className="sx-surface divide-y overflow-hidden">
            {filteredProblems.map((problem) => {
              const translations = Object.keys(problem.title_i18n || {}).length;
              const tests = Array.isArray(problem.test_cases) ? problem.test_cases.length : 0;
              return (
                <article key={problem.id} className="group grid gap-4 px-4 py-4 transition-colors hover:bg-muted/25 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                  <div className="grid size-10 place-items-center rounded-[var(--sx-radius-control)] border bg-muted/35 font-mono text-xs text-muted-foreground">
                    {problem.code != null ? `#${problem.code}` : "—"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{getLocalized(problem.title_i18n, locale)}</h3>
                      <Badge variant="outline" className="capitalize">{problem.difficulty || "easy"}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{markdownPreview(getLocalized(problem.description_i18n, locale))}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Languages className="size-3.5" />{translations} {copy.translations}</span>
                      <span className="inline-flex items-center gap-1.5"><FlaskConical className="size-3.5" />{tests} {copy.tests}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:justify-end">
                    <Button asChild variant="ghost" size="icon-sm" aria-label={copy.openPublic}>
                      <Link href={`/problems/${problem.id}`} target="_blank"><ExternalLink /></Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/problems/${problem.id}`}><Pencil />{t("admin.problems.edit")}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(problem.id)}
                      aria-label={t("admin.problems.delete")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.problems.dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.problems.dialog.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.problems.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>{t("admin.problems.dialog.confirmDelete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent
          className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1440px] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[1440px]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("admin.problems.dialog.createTitle")}</DialogTitle>
            <DialogDescription>{copy.subtitle}</DialogDescription>
          </DialogHeader>
          <ProblemForm
            fillHeight
            className="p-4 sm:p-5 lg:p-6"
            onCancel={() => setOpenCreate(false)}
            onSuccess={() => {
              setOpenCreate(false);
              void queryClient.invalidateQueries({ queryKey: adminProblemsQueryKey });
              void queryClient.invalidateQueries({ queryKey: ["problems"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function AdminProblemsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminProblemsContent />
    </RouteGuard>
  );
}
