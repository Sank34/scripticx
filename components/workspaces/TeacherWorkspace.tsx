"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { enUS, ro as roLocale } from "date-fns/locale";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Copy,
  GraduationCap,
  LoaderCircle,
  Plus,
  RotateCcw,
  School,
  Search,
  Share2,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  loadTeacherWorkspaceData,
  type TeacherAssignmentSummary,
  type TeacherClassSummary,
} from "@/lib/teacher-workspace";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";

type TeacherSection =
  | "analytics"
  | "assignments"
  | "calendar"
  | "classes"
  | "dashboard"
  | "students";

function useTeacherData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-workspace", user?.id],
    queryFn: () => loadTeacherWorkspaceData(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });
}

function TeacherPage({
  children,
  description,
  eyebrow,
  title,
  tourId,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  tourId?: string;
}) {
  return (
    <div className="space-y-6 pb-8" data-tour={tourId}>
      <div className="border-b border-border/70 pb-5">
        {eyebrow && <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <PageHeader title={title} subtitle={description} />
      </div>
      {children}
    </div>
  );
}

function TeacherLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl sm:col-span-2" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function TeacherError({ onRetry }: { onRetry: () => void }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
      <CircleAlert className="size-8 text-destructive" />
      <h2 className="mt-4 font-semibold">
        {ro ? "Workspace-ul nu s-a putut încărca" : "Workspace could not load"}
      </h2>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCcw className="size-4" />
        {ro ? "Reîncearcă" : "Retry"}
      </Button>
    </div>
  );
}

function CreateClassDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const ro = locale === "ro";
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function createClass() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_class_secure", {
        p_name: name.trim(),
      });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teacher-workspace"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]);
      setName("");
      onOpenChange(false);
      toast.success(ro ? "Clasa a fost creată." : "Class created.");
    } catch (error) {
      toast.error(ro ? "Clasa nu a putut fi creată." : "Could not create class.", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) setName("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createClass();
          }}
        >
          <DialogHeader>
            <DialogTitle>{ro ? "Creează o clasă" : "Create a class"}</DialogTitle>
            <DialogDescription>
              {ro
                ? "Clasa primește automat un cod unic pe care îl poți distribui elevilor."
                : "Your class receives a unique code that you can share with students."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="teacher-class-name" className="text-sm font-medium">
                {ro ? "Numele clasei" : "Class name"}
              </label>
              <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {name.length}/120
              </span>
            </div>
            <Input
              id="teacher-class-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={ro ? "Ex. Informatică · clasa a X-a" : "e.g. Computer Science · Grade 10"}
              maxLength={120}
              autoComplete="off"
              autoFocus
              required
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {ro
                ? "Folosește un nume ușor de recunoscut de către elevi. Îl vei putea organiza ulterior din spațiul clasei."
                : "Choose a name students can recognize. You can organize the class later from its workspace."}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setName("");
                onOpenChange(false);
              }}
            >
              {ro ? "Anulează" : "Cancel"}
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <LoaderCircle className="size-4 animate-spin" />}
              {saving
                ? ro
                  ? "Se creează..."
                  : "Creating..."
                : ro
                  ? "Creează clasa"
                  : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyTeacherWorkspace({ onCreate }: { onCreate: () => void }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  return (
    <div className="overflow-hidden rounded-[var(--sx-radius-panel)] border border-border bg-card px-6 py-10 sm:px-10">
      <div className="max-w-2xl">
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-foreground">
          <School className="size-6" />
        </span>
        <h2 className="mt-6 text-3xl font-semibold">
          {ro ? "Prima ta clasă începe aici." : "Your first class starts here."}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {ro
            ? "Creează o clasă, trimite codul elevilor și vei vedea automat temele și progresul lor în acest dashboard."
            : "Create a class, share its code with students, and assignments and progress will appear here automatically."}
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          {ro ? "Creează prima clasă" : "Create first class"}
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/75 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="size-4.5" />
          </span>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function AssignmentStatusBadge({ assignment }: { assignment: TeacherAssignmentSummary }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  if (assignment.status === "overdue") {
    return <Badge variant="destructive">{ro ? "Încheiată" : "Past due"}</Badge>;
  }
  if (assignment.status === "no_deadline") {
    return <Badge variant="secondary">{ro ? "Fără termen" : "No deadline"}</Badge>;
  }
  return (
    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
      {ro ? "Urmează" : "Upcoming"}
    </Badge>
  );
}

export function TeacherDashboard() {
  const query = useTeacherData();
  const { locale } = useLanguage();
  const { profile, user } = useAuth();
  const ro = locale === "ro";
  const dateLocale = ro ? roLocale : enUS;
  const [createOpen, setCreateOpen] = useState(false);
  const name = profile?.username || user?.email?.split("@")[0] || "";
  const data = query.data;

  return (
    <TeacherPage
      tourId="teacher-dashboard"
      eyebrow={ro ? "Workspace profesor" : "Teacher workspace"}
      title={`${ro ? "Bine ai revenit" : "Welcome back"}${name ? `, ${name}` : ""}.`}
      description={
        ro
          ? "Urmărește clasele, deadline-urile și progresul elevilor dintr-o singură privire."
          : "See classes, deadlines and student progress at a glance."
      }
    >
      {query.isPending ? (
        <TeacherLoading />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : !data?.classes.length ? (
        <EmptyTeacherWorkspace onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {ro ? "Clasă nouă" : "New class"}
            </Button>
          </div>
          <section className="grid gap-3 md:grid-cols-3">
            <StatCard
              icon={UsersRound}
              label={ro ? "Elevi înscriși" : "Students enrolled"}
              value={String(data.totals.students)}
              detail={`${data.totals.classes} ${ro ? "clase active" : "active classes"}`}
            />
            <StatCard
              icon={TrendingUp}
              label={ro ? "Progres mediu" : "Average completion"}
              value={`${data.totals.completionRate}%`}
              detail={ro ? "din problemele atribuite" : "of assigned problems"}
            />
            <StatCard
              icon={ClipboardCheck}
              label={ro ? "Teme create" : "Assignments created"}
              value={String(data.totals.assignments)}
              detail={`${data.totals.upcomingAssignments} ${ro ? "cu termen viitor" : "upcoming deadlines"}`}
            />
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold">
                    {ro ? "Elevi cu progres ridicat" : "Top performing students"}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ro ? "Pe baza temelor din clasele tale" : "Based on your class assignments"}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/workspace/teacher/students">
                    {ro ? "Toți elevii" : "All students"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <CardContent className="space-y-5 p-5">
                {data.students.slice(0, 6).map((student, index) => (
                  <div key={student.id} className="grid grid-cols-[minmax(0,180px)_minmax(120px,1fr)_44px] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-4 text-[11px] tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <UserAvatar
                        username={student.username}
                        avatarUrl={student.avatarUrl}
                        equippedRewards={student.equippedRewards as never}
                        className="size-8"
                      />
                      <span className="truncate text-sm font-medium">{student.username}</span>
                    </div>
                    <div className="h-8 overflow-hidden rounded-lg bg-muted/60">
                      <div
                        className="h-full rounded-lg bg-foreground/70 transition-[width] duration-700"
                        style={{ width: `${Math.max(student.completionRate, 3)}%` }}
                      />
                    </div>
                    <span className="text-right text-sm font-medium tabular-nums">
                      {student.completionRate}%
                    </span>
                  </div>
                ))}
                {!data.students.length && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {ro ? "Elevii vor apărea după ce folosesc codul clasei." : "Students appear after joining with a class code."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold">{ro ? "Deadline-uri" : "Scheduled work"}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ro ? "Următoarele teme" : "Upcoming assignments"}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/workspace/teacher/calendar">
                    <CalendarDays className="size-4" />
                    {ro ? "Calendar" : "Calendar"}
                  </Link>
                </Button>
              </div>
              <div className="divide-y">
                {data.assignments
                  .filter((assignment) => assignment.status === "upcoming")
                  .slice(0, 4)
                  .map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/classes/${assignment.classId}/assignments/${assignment.id}`}
                      className="group block px-5 py-4 transition hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{assignment.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{assignment.className}</p>
                        </div>
                        <AssignmentStatusBadge assignment={assignment} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {assignment.deadline
                          ? format(new Date(assignment.deadline), "d MMM · HH:mm", {
                              locale: dateLocale,
                            })
                          : "—"}
                        <span className="ml-auto tabular-nums">{assignment.completionRate}%</span>
                      </div>
                    </Link>
                  ))}
                {!data.assignments.some((assignment) => assignment.status === "upcoming") && (
                  <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {ro ? "Nu există deadline-uri viitoare." : "No upcoming deadlines."}
                  </p>
                )}
              </div>
            </Card>
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold">{ro ? "Performanța claselor" : "Class performance"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ro ? "Procentul de probleme trimise" : "Share of assigned problems submitted"}
                </p>
              </div>
              <CardContent className="space-y-5 p-5">
                {data.classes.map((classItem) => (
                  <div key={classItem.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <Link href={`/classes/${classItem.id}`} className="font-medium hover:underline">
                        {classItem.name}
                      </Link>
                      <span className="tabular-nums text-muted-foreground">{classItem.completionRate}%</span>
                    </div>
                    <Progress value={classItem.completionRate} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold">{ro ? "Activitate recentă" : "Recent activity"}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ro ? "Ultimele trimiteri ale elevilor" : "Latest student submissions"}
                  </p>
                </div>
                <Activity className="size-4 text-muted-foreground" />
              </div>
              <div className="max-h-80 divide-y overflow-y-auto note-scrollbar">
                {data.activity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Check className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5">
                        <span className="font-medium">{activity.studentName}</span>{" "}
                        {ro ? "a trimis o rezolvare la" : "submitted work for"}{" "}
                        <Link
                          href={`/classes/${activity.classId}/assignments/${activity.assignmentId}`}
                          className="font-medium hover:underline"
                        >
                          {activity.assignmentTitle}
                        </Link>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.className}
                        {activity.createdAt
                          ? ` · ${format(new Date(activity.createdAt), "d MMM, HH:mm", {
                              locale: dateLocale,
                            })}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {!data.activity.length && (
                  <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {ro ? "Activitatea elevilor va apărea aici." : "Student activity will appear here."}
                  </p>
                )}
              </div>
            </Card>
          </section>
        </>
      )}
      <CreateClassDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TeacherPage>
  );
}

type TeacherClassHealth = "active" | "attention" | "setup";
type TeacherClassSort = "completion" | "name" | "students";

type TeacherClassView = TeacherClassSummary & {
  health: TeacherClassHealth;
  nextAssignment: TeacherAssignmentSummary | null;
};

function ClassOverviewMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-l border-border pl-4 first:border-l-0 first:pl-0 sm:pl-5",
        className
      )}
    >
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function TeacherClasses() {
  const query = useTeacherData();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TeacherClassHealth>("all");
  const [sort, setSort] = useState<TeacherClassSort>("name");
  const data = query.data;

  const classes = useMemo<TeacherClassView[]>(() => {
    if (!data) return [];

    return data.classes.map((classItem) => {
      const assignments = data.assignments.filter(
        (assignment) => assignment.classId === classItem.id
      );
      const nextAssignment =
        assignments.find((assignment) => assignment.status === "upcoming") || null;
      const hasIncompletePastDue = assignments.some(
        (assignment) =>
          assignment.status === "overdue" && assignment.completionRate < 100
      );
      const needsSetup =
        classItem.studentCount === 0 ||
        classItem.assignmentCount === 0 ||
        classItem.expectedProblems === 0;
      const needsAttention =
        !needsSetup &&
        (hasIncompletePastDue ||
          (classItem.expectedProblems > 0 && classItem.completionRate < 50));

      return {
        ...classItem,
        health: needsSetup ? "setup" : needsAttention ? "attention" : "active",
        nextAssignment,
      };
    });
  }, [data]);

  const classCounts = useMemo(
    () => ({
      active: classes.filter((classItem) => classItem.health === "active").length,
      attention: classes.filter((classItem) => classItem.health === "attention").length,
      setup: classes.filter((classItem) => classItem.health === "setup").length,
    }),
    [classes]
  );

  const visibleClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(locale);
    const filtered = classes.filter((classItem) => {
      const matchesFilter = filter === "all" || classItem.health === filter;
      const matchesSearch =
        !normalizedSearch ||
        classItem.name.toLocaleLowerCase(locale).includes(normalizedSearch) ||
        classItem.inviteCode.toLocaleLowerCase(locale).includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });

    return filtered.sort((left, right) => {
      if (sort === "students") {
        return right.studentCount - left.studentCount ||
          left.name.localeCompare(right.name, locale);
      }
      if (sort === "completion") {
        return right.completionRate - left.completionRate ||
          left.name.localeCompare(right.name, locale);
      }
      return left.name.localeCompare(right.name, locale);
    });
  }, [classes, filter, locale, search, sort]);

  async function copyInviteCode(classItem: TeacherClassView) {
    if (!classItem.inviteCode) return;
    try {
      await navigator.clipboard.writeText(classItem.inviteCode);
      toast.success(ro ? "Codul clasei a fost copiat." : "Class code copied.", {
        description: classItem.name,
      });
    } catch {
      toast.error(
        ro ? "Codul nu a putut fi copiat." : "The code could not be copied."
      );
    }
  }

  async function shareClass(classItem: TeacherClassView) {
    if (!classItem.inviteCode) return;
    const shareText = ro
      ? `Intră în clasa „${classItem.name}” din ScripticX cu codul ${classItem.inviteCode}.`
      : `Join “${classItem.name}” on ScripticX with code ${classItem.inviteCode}.`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: classItem.name,
          text: shareText,
          url: `${window.location.origin}/classes`,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${shareText} ${window.location.origin}/classes`
      );
      toast.success(
        ro ? "Invitația a fost copiată." : "Invitation copied.",
        {
          description: ro
            ? "O poți trimite acum elevilor."
            : "You can now send it to your students.",
        }
      );
    } catch {
      toast.error(
        ro
          ? "Invitația nu a putut fi distribuită."
          : "The invitation could not be shared."
      );
    }
  }

  function healthLabel(health: TeacherClassHealth) {
    if (health === "setup") return ro ? "De configurat" : "Setup needed";
    if (health === "attention") return ro ? "Necesită atenție" : "Needs attention";
    return ro ? "În regulă" : "On track";
  }

  return (
    <TeacherPage
      tourId="teacher-classes"
      eyebrow={ro ? "Administrare" : "Management"}
      title={ro ? "Clase" : "Classes"}
      description={
        ro
          ? "Organizează clasele, invită elevii și identifică rapid unde este nevoie de intervenție."
          : "Organize classes, invite students and quickly spot where support is needed."
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {ro
            ? "Progresul este calculat din problemele atribuite și trimiterile elevilor."
            : "Progress is calculated from assigned problems and student submissions."}
        </p>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          {ro ? "Clasă nouă" : "New class"}
        </Button>
      </div>

      {query.isPending ? (
        <div aria-label={ro ? "Se încarcă clasele" : "Loading classes"} aria-busy="true">
          <TeacherLoading />
        </div>
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : !classes.length ? (
        <EmptyTeacherWorkspace onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <section
            aria-label={ro ? "Sumarul claselor" : "Classes summary"}
            className="grid grid-cols-2 gap-y-5 rounded-[var(--sx-radius-panel)] border border-border bg-card px-5 py-5 sm:grid-cols-4 sm:px-6"
          >
            <ClassOverviewMetric
              label={ro ? "Clase" : "Classes"}
              value={String(data?.totals.classes || 0)}
            />
            <ClassOverviewMetric
              label={ro ? "Elevi" : "Students"}
              value={String(data?.totals.students || 0)}
            />
            <ClassOverviewMetric
              className="border-l-0 pl-0 sm:border-l sm:pl-5"
              label={ro ? "Teme" : "Assignments"}
              value={String(data?.totals.assignments || 0)}
            />
            <ClassOverviewMetric
              label={ro ? "Progres general" : "Overall progress"}
              value={`${data?.totals.completionRate || 0}%`}
            />
          </section>

          <section aria-labelledby="teacher-classes-list-title" className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 id="teacher-classes-list-title" className="font-semibold">
                  {ro ? "Toate clasele" : "All classes"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
                  {visibleClasses.length} {ro ? "rezultate" : "results"}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 sm:w-72">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={ro ? "Caută după nume sau cod..." : "Search by name or code..."}
                    aria-label={ro ? "Caută clase" : "Search classes"}
                    className="pl-9"
                  />
                </div>
                <Select value={sort} onValueChange={(value) => setSort(value as TeacherClassSort)}>
                  <SelectTrigger className="w-full sm:w-48" aria-label={ro ? "Sortează clasele" : "Sort classes"}>
                    <ArrowUpDown className="size-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{ro ? "Nume" : "Name"}</SelectItem>
                    <SelectItem value="students">{ro ? "Număr de elevi" : "Student count"}</SelectItem>
                    <SelectItem value="completion">{ro ? "Progres" : "Progress"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              role="group"
              aria-label={ro ? "Filtrează clasele după stare" : "Filter classes by status"}
              className="flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1"
            >
              <Button
                type="button"
                size="sm"
                variant={filter === "all" ? "secondary" : "ghost"}
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                  {ro ? "Toate" : "All"} <span className="ml-1 tabular-nums">{classes.length}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "active" ? "secondary" : "ghost"}
                aria-pressed={filter === "active"}
                onClick={() => setFilter("active")}
              >
                  {ro ? "În regulă" : "On track"} <span className="ml-1 tabular-nums">{classCounts.active}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "attention" ? "secondary" : "ghost"}
                aria-pressed={filter === "attention"}
                onClick={() => setFilter("attention")}
              >
                  {ro ? "Atenție" : "Attention"} <span className="ml-1 tabular-nums">{classCounts.attention}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "setup" ? "secondary" : "ghost"}
                aria-pressed={filter === "setup"}
                onClick={() => setFilter("setup")}
              >
                  {ro ? "De configurat" : "Setup"} <span className="ml-1 tabular-nums">{classCounts.setup}</span>
              </Button>
            </div>

            {visibleClasses.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleClasses.map((classItem) => (
                  <article
                    key={classItem.id}
                    className="flex min-w-0 flex-col rounded-[var(--sx-radius-card)] border border-border bg-card transition-colors hover:border-foreground/20"
                  >
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                            <School className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">{classItem.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {classItem.studentCount} {ro ? "elevi" : "students"} · {classItem.assignmentCount} {ro ? "teme" : "assignments"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={classItem.health === "attention" ? "destructive" : "secondary"}
                          className={cn(
                            "shrink-0",
                            classItem.health === "active" &&
                              "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          )}
                        >
                          {healthLabel(classItem.health)}
                        </Badge>
                      </div>

                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {ro ? "Progresul clasei" : "Class progress"}
                          </span>
                          <span className="font-medium tabular-nums">
                            {classItem.completionRate}%
                          </span>
                        </div>
                        <Progress
                          value={classItem.completionRate}
                          aria-label={`${ro ? "Progres" : "Progress"}: ${classItem.completionRate}%`}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {classItem.expectedProblems
                            ? `${classItem.completedProblems}/${classItem.expectedProblems} ${ro ? "probleme trimise" : "assigned problems submitted"}`
                            : ro
                              ? "Adaugă o temă pentru a începe măsurarea progresului."
                              : "Add an assignment to start measuring progress."}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/35 px-3 py-3">
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {ro ? "Următorul deadline" : "Next deadline"}
                          </p>
                          <p className="mt-1.5 truncate text-sm font-medium">
                            {classItem.nextAssignment?.deadline
                              ? new Intl.DateTimeFormat(ro ? "ro-RO" : "en-US", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(classItem.nextAssignment.deadline))
                              : ro
                                ? "Niciunul programat"
                                : "Nothing scheduled"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/35 px-3 py-3">
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <BookOpenCheck className="size-3.5" aria-hidden="true" />
                            {ro ? "Activitate" : "Coursework"}
                          </p>
                          <p className="mt-1.5 truncate text-sm font-medium">
                            {classItem.nextAssignment?.title ||
                              (ro ? "Pregătită pentru conținut" : "Ready for coursework")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg border border-border bg-background px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {ro ? "Cod de acces" : "Invite code"}
                            </p>
                            <code className="mt-1 block truncate text-sm font-semibold tracking-normal text-foreground">
                              {classItem.inviteCode || (ro ? "Indisponibil" : "Unavailable")}
                            </code>
                          </div>
                          {classItem.inviteCode ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`${ro ? "Copiază codul pentru" : "Copy code for"} ${classItem.name}`}
                                onClick={() => void copyInviteCode(classItem)}
                              >
                                <Copy className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`${ro ? "Distribuie invitația pentru" : "Share invitation for"} ${classItem.name}`}
                                onClick={() => void shareClass(classItem)}
                              >
                                <Share2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <p className="text-xs text-muted-foreground">
                        {classItem.health === "setup"
                          ? ro
                            ? "Finalizează configurarea pentru a începe."
                            : "Finish setup to get the class started."
                          : classItem.health === "attention"
                            ? ro
                              ? "Verifică temele nefinalizate."
                              : "Review incomplete coursework."
                            : ro
                              ? "Clasa este la zi."
                              : "Class activity is on track."}
                      </p>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link href={`/classes/${classItem.id}`}>
                          {ro ? "Administrează clasa" : "Manage class"}
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-[var(--sx-radius-panel)] border border-dashed border-border px-6 text-center">
                <Search className="size-7 text-muted-foreground/60" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">
                  {ro ? "Nu am găsit clase" : "No classes found"}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {ro
                    ? "Schimbă filtrul sau caută după un alt nume ori cod de acces."
                    : "Change the filter or search for another name or invite code."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  {ro ? "Resetează filtrele" : "Reset filters"}
                </Button>
              </div>
            )}
          </section>
        </>
      )}
      <CreateClassDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TeacherPage>
  );
}

export function TeacherStudents() {
  const query = useTeacherData();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [search, setSearch] = useState("");
  const students = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return query.data?.students || [];
    return (query.data?.students || []).filter(
      (student) =>
        student.username.toLowerCase().includes(normalized) ||
        student.classNames.some((name) => name.toLowerCase().includes(normalized))
    );
  }, [query.data?.students, search]);

  return (
    <TeacherPage
      tourId="teacher-students"
      eyebrow={ro ? "Administrare" : "Management"}
      title={ro ? "Elevi" : "Students"}
      description={
        ro
          ? "Vezi elevii din toate clasele tale și progresul lor cumulat."
          : "View students across your classes and their combined progress."
      }
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={ro ? "Caută elev sau clasă..." : "Search student or class..."}
          className="pl-9"
        />
      </div>
      {query.isPending ? (
        <TeacherLoading />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : (
        <Card className="overflow-hidden border-border/75 shadow-sm">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_90px] gap-4 border-b bg-muted/25 px-5 py-3 text-xs font-medium text-muted-foreground max-md:hidden">
            <span>{ro ? "Elev" : "Student"}</span>
            <span>{ro ? "Clase" : "Classes"}</span>
            <span className="text-right">{ro ? "Trimise" : "Submitted"}</span>
            <span className="text-right">{ro ? "Progres" : "Progress"}</span>
          </div>
          <div className="divide-y">
            {students.map((student) => (
              <div
                key={student.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-muted/30 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_90px] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    username={student.username}
                    avatarUrl={student.avatarUrl}
                    equippedRewards={student.equippedRewards as never}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/u/${encodeURIComponent(student.username)}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {student.username}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {student.lastActivityAt
                        ? `${ro ? "Activ" : "Active"} ${new Date(student.lastActivityAt).toLocaleDateString(ro ? "ro-RO" : "en-US")}`
                        : ro
                          ? "Fără activitate încă"
                          : "No activity yet"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {student.classNames.map((name) => (
                    <Badge key={name} variant="secondary">{name}</Badge>
                  ))}
                </div>
                <p className="text-sm tabular-nums md:text-right">
                  {student.completedProblems}/{student.assignedProblems}
                </p>
                <div className="flex items-center gap-2 md:justify-end">
                  <Progress value={student.completionRate} className="max-w-20 md:hidden" />
                  <span className="text-sm font-medium tabular-nums">{student.completionRate}%</span>
                </div>
              </div>
            ))}
            {!students.length && (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <UsersRound className="size-8 text-muted-foreground/45" />
                <p className="mt-3 text-sm font-medium">
                  {search
                    ? ro
                      ? "Nu am găsit niciun elev."
                      : "No students found."
                    : ro
                      ? "Elevii vor apărea după ce intră într-o clasă."
                      : "Students appear after joining a class."}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </TeacherPage>
  );
}

export function TeacherAssignments() {
  const query = useTeacherData();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [filter, setFilter] = useState<"all" | "no_deadline" | "overdue" | "upcoming">("all");
  const assignments = (query.data?.assignments || []).filter(
    (assignment) => filter === "all" || assignment.status === filter
  );

  return (
    <TeacherPage
      tourId="teacher-assignments"
      eyebrow={ro ? "Conținut" : "Coursework"}
      title={ro ? "Teme și teste" : "Assignments & tests"}
      description={
        ro
          ? "Urmărește deadline-urile și rata de completare pentru fiecare clasă."
          : "Track deadlines and completion for every class."
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="all">{ro ? "Toate" : "All"}</TabsTrigger>
            <TabsTrigger value="upcoming">{ro ? "Urmează" : "Upcoming"}</TabsTrigger>
            <TabsTrigger value="overdue">{ro ? "Încheiate" : "Past due"}</TabsTrigger>
            <TabsTrigger value="no_deadline">{ro ? "Fără termen" : "No deadline"}</TabsTrigger>
          </TabsList>
        </Tabs>
        {query.data?.classes[0] && (
          <Button asChild>
            <Link href={`/classes/${query.data.classes[0].id}`}>
              <Plus className="size-4" />
              {ro ? "Temă nouă" : "New assignment"}
            </Link>
          </Button>
        )}
      </div>
      {query.isPending ? (
        <TeacherLoading />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border-border/75 shadow-sm transition hover:border-foreground/15">
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_160px_180px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold">{assignment.title}</h2>
                    <AssignmentStatusBadge assignment={assignment} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{assignment.className}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="mt-1 text-sm font-medium">
                    {assignment.deadline
                      ? new Intl.DateTimeFormat(ro ? "ro-RO" : "en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(assignment.deadline))
                      : "—"}
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{ro ? "Completare" : "Completion"}</span>
                    <span className="font-medium tabular-nums">{assignment.completionRate}%</span>
                  </div>
                  <Progress value={assignment.completionRate} />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {assignment.completedProblems}/{assignment.expectedProblems} {ro ? "rezolvări" : "solutions"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/classes/${assignment.classId}/assignments/${assignment.id}`}>
                    {ro ? "Deschide" : "Open"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!assignments.length && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
              <ClipboardList className="size-8 text-muted-foreground/45" />
              <p className="mt-3 text-sm font-medium">
                {ro ? "Nu există teme în această categorie." : "No assignments in this category."}
              </p>
            </div>
          )}
        </div>
      )}
    </TeacherPage>
  );
}

export function TeacherCalendar() {
  const query = useTeacherData();
  const router = useRouter();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const dateLocale = ro ? roLocale : enUS;
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const visibleDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  );
  const assignments = (query.data?.assignments || []).filter(
    (assignment) => assignment.deadline
  );

  return (
    <TeacherPage
      tourId="teacher-calendar"
      eyebrow={ro ? "Planificare" : "Planning"}
      title={ro ? "Calendarul claselor" : "Class calendar"}
      description={
        ro
          ? "Toate deadline-urile elevilor, organizate pe lună și clasă."
          : "Every student deadline organized by month and class."
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setMonth((value) => subMonths(value, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setMonth((value) => addMonths(value, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
          {ro ? "Astăzi" : "Today"}
        </Button>
        <h2 className="ml-1 text-xl font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: dateLocale })}
        </h2>
      </div>
      {query.isPending ? (
        <Skeleton className="h-[680px] rounded-2xl" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b bg-muted/25">
              {visibleDays.slice(0, 7).map((day) => (
                <div key={day.toISOString()} className="px-3 py-2.5 text-xs font-medium capitalize text-muted-foreground">
                  {format(day, "EEE", { locale: dateLocale })}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {visibleDays.map((day, index) => {
                const dayAssignments = assignments.filter(
                  (assignment) =>
                    assignment.deadline && isSameDay(new Date(assignment.deadline), day)
                );
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-32 border-b border-r p-2",
                      index % 7 === 6 && "border-r-0",
                      index >= visibleDays.length - 7 && "border-b-0",
                      !isSameMonth(day, month) && "bg-muted/20"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                        isToday(day) && "bg-foreground text-background",
                        !isSameMonth(day, month) && !isToday(day) && "text-muted-foreground/60"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-2 space-y-1">
                      {dayAssignments.slice(0, 4).map((assignment) => (
                        <button
                          key={assignment.id}
                          type="button"
                          onClick={() =>
                            router.push(
                              `/classes/${assignment.classId}/assignments/${assignment.id}`
                            )
                          }
                          className="w-full truncate rounded-md border border-border bg-muted/60 px-2 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <span className="mr-1 opacity-65">
                            {format(new Date(assignment.deadline!), "HH:mm")}
                          </span>
                          {assignment.title}
                        </button>
                      ))}
                      {dayAssignments.length > 4 && (
                        <p className="px-1 text-[11px] text-muted-foreground">
                          +{dayAssignments.length - 4} {ro ? "altele" : "more"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </TeacherPage>
  );
}

export function TeacherAnalytics() {
  const query = useTeacherData();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const data = query.data;

  return (
    <TeacherPage
      tourId="teacher-analytics"
      eyebrow={ro ? "Insight-uri" : "Insights"}
      title={ro ? "Analiză" : "Analytics"}
      description={
        ro
          ? "Compară progresul claselor și identifică rapid elevii care au nevoie de sprijin."
          : "Compare class progress and quickly identify students who need support."
      }
    >
      {query.isPending ? (
        <TeacherLoading />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <StatCard
              icon={BarChart3}
              label={ro ? "Rată totală" : "Overall completion"}
              value={`${data.totals.completionRate}%`}
              detail={ro ? "toate clasele" : "across all classes"}
            />
            <StatCard
              icon={UserRoundCheck}
              label={ro ? "Peste 75%" : "Above 75%"}
              value={String(data.students.filter((student) => student.completionRate >= 75).length)}
              detail={ro ? "elevi cu ritm bun" : "students on track"}
            />
            <StatCard
              icon={CircleAlert}
              label={ro ? "Sub 40%" : "Below 40%"}
              value={String(data.students.filter((student) => student.assignedProblems > 0 && student.completionRate < 40).length)}
              detail={ro ? "ar putea avea nevoie de ajutor" : "may need support"}
            />
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold">{ro ? "Comparație între clase" : "Class comparison"}</h2>
              </div>
              <CardContent className="space-y-7 p-6">
                {data.classes.map((classItem) => (
                  <div key={classItem.id}>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div>
                        <Link href={`/classes/${classItem.id}`} className="text-sm font-medium hover:underline">
                          {classItem.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {classItem.studentCount} {ro ? "elevi" : "students"} · {classItem.assignmentCount} {ro ? "teme" : "assignments"}
                        </p>
                      </div>
                      <span className="text-lg font-semibold tabular-nums">{classItem.completionRate}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/70 transition-[width] duration-700"
                        style={{ width: `${classItem.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!data.classes.length && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {ro ? "Creează o clasă pentru a vedea analiza." : "Create a class to see analytics."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/75 shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold">{ro ? "Necesită atenție" : "Needs attention"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ro ? "Elevi cu teme atribuite și progres redus" : "Students with assigned work and low progress"}
                </p>
              </div>
              <div className="divide-y">
                {data.students
                  .filter((student) => student.assignedProblems > 0 && student.completionRate < 50)
                  .slice(0, 8)
                  .map((student) => (
                    <div key={student.id} className="flex items-center gap-3 px-5 py-3.5">
                      <UserAvatar
                        username={student.username}
                        avatarUrl={student.avatarUrl}
                        equippedRewards={student.equippedRewards as never}
                        className="size-8"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{student.username}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.classNames.join(", ")}</p>
                      </div>
                      <Badge variant="destructive">{student.completionRate}%</Badge>
                    </div>
                  ))}
                {!data.students.some((student) => student.assignedProblems > 0 && student.completionRate < 50) && (
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <GraduationCap className="size-8 text-emerald-500" />
                    <p className="mt-3 text-sm font-medium">
                      {ro ? "Toți elevii sunt pe drumul bun." : "Everyone is on track."}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </TeacherPage>
  );
}

export function TeacherWorkspaceSection({ section }: { section: TeacherSection }) {
  if (section === "classes") return <TeacherClasses />;
  if (section === "students") return <TeacherStudents />;
  if (section === "assignments") return <TeacherAssignments />;
  if (section === "calendar") return <TeacherCalendar />;
  if (section === "analytics") return <TeacherAnalytics />;
  return <TeacherDashboard />;
}
