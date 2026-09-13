"use client";
import { useAuth } from "@/hooks/useAuth";
import { DailyChallengeScheduler } from "@/components/admin/DailyChallengeScheduler";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalized } from "@/lib/getLocalized";
import { markdownPreview } from "@/lib/markdownPreview";
import { matchesProblemSearch } from "@/lib/problem-search";
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

function AdminProblemsContent() {
  const { can, user } = useAuth();
  const canManageProblems = can("admin.problems");
  const canManageDaily = can("admin.daily");
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
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

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const adminProblemsQueryKey = ["admin", "problems", user?.id, canManageProblems] as const;

  const problemsQuery = useQuery({
    queryKey: adminProblemsQueryKey,
    enabled: canManageProblems,
    queryFn: async () => {
      const { data: problemRows, error } = await supabase.from("problems").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return {
        problems: (problemRows || []) as AdminProblem[],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const problems = useMemo(() => problemsQuery.data?.problems || [], [problemsQuery.data?.problems]);
  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const title = getLocalized(problem.title_i18n, locale);
      const description = getLocalized(problem.description_i18n, locale);
      const matchesSearch = matchesProblemSearch({ code: problem.code, title, description }, search, locale);
      const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [difficulty, locale, problems, search]);

  async function handleDelete() {
    if (!deleteId || !canManageProblems || deleting) return;
    const targetId = deleteId;
    setDeleting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error(sessionError?.message || "Session expired");
      }
      const response = await fetch(`/api/admin/problems/${encodeURIComponent(targetId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || t("admin.problems.toast.deleteError"));

      queryClient.setQueryData<typeof problemsQuery.data>(adminProblemsQueryKey, (current) =>
        current ? { ...current, problems: current.problems.filter((problem) => problem.id !== targetId) } : current
      );
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      setDeleteId(null);
      toast.success(t("admin.problems.toast.deleted"));
    } catch (error) {
      toast.error(t("admin.problems.toast.deleteError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }


  return (
    <main className="sx-page space-y-8 pb-16">
      <PageHeader
        title={t("admin.problems.manageTitle")}
        subtitle={canManageProblems ? (canManageDaily ? copy.subtitle : copy.libraryDescription) : copy.dailyDescription}
        meta={canManageProblems ? <Badge variant="secondary">{problems.length}</Badge> : undefined}
        action={canManageProblems && (
          <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/problems/chapters">{locale === "ro" ? "Capitole" : "Chapters"}</Link>
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus />
            {t("admin.problems.create")}
          </Button>
          </div>
        )}
      />

      {canManageDaily && <DailyChallengeScheduler />}

      {canManageProblems && <><section className="space-y-4">
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
            <AlertDialogCancel disabled={deleting}>{t("admin.problems.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void handleDelete(); }}>
              {deleting ? (ro ? "Se șterge…" : "Deleting…") : t("admin.problems.dialog.confirmDelete")}
            </AlertDialogAction>
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
      </>}
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
