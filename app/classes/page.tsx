"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { ArrowRight, BookOpen, CalendarClock, Check, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { loadClassDirectory, type ClassDirectoryItem, type ClassRole } from "@/lib/class-hub";
import { supabase } from "@/lib/supabase";
import { getWorkspacePersonaFromMetadata } from "@/lib/workspaces";

const copy = {
  en: {
    title: "Classes", subtitle: "Assignments, resources, progress, and class activity in one place.", create: "Create class", join: "Join class",
    joinTitle: "Join a class", joinDescription: "Enter the invitation code provided by your teacher.", code: "Invitation code",
    createTitle: "Create a class", createDescription: "Start a class hub for assignments, resources, and student progress.", className: "Class name",
    empty: "No classes match the current filters.", active: "Active classes", upcoming: "Upcoming assignments", overdue: "Overdue", progress: "Average progress",
    search: "Search classes", allRoles: "All roles", student: "Student", teacher: "Teacher", admin: "Administrator", recent: "Recently added", name: "Class name",
    nextDeadline: "Next deadline", noDeadline: "No upcoming deadline", assignments: "assignments", students: "students", open: "Open class",
    created: "Class created.", joined: "Class added to your workspace.", retry: "Try again", loadError: "Classes could not be loaded.", signIn: "Sign in", signInRequired: "Sign in to access your classes and assignments.",
  },
  ro: {
    title: "Clase", subtitle: "Teme, resurse, progres și activitatea clasei într-un singur loc.", create: "Creează clasa", join: "Intră într-o clasă",
    joinTitle: "Intră într-o clasă", joinDescription: "Introdu codul de invitație primit de la profesor.", code: "Cod de invitație",
    createTitle: "Creează o clasă", createDescription: "Pornește un spațiu pentru teme, resurse și progresul elevilor.", className: "Numele clasei",
    empty: "Nicio clasă nu corespunde filtrelor curente.", active: "Clase active", upcoming: "Teme în curând", overdue: "Întârziate", progress: "Progres mediu",
    search: "Caută clase", allRoles: "Toate rolurile", student: "Elev", teacher: "Profesor", admin: "Administrator", recent: "Adăugate recent", name: "Numele clasei",
    nextDeadline: "Următorul termen", noDeadline: "Niciun termen apropiat", assignments: "teme", students: "elevi", open: "Deschide clasa",
    created: "Clasa a fost creată.", joined: "Clasa a fost adăugată în workspace.", retry: "Reîncearcă", loadError: "Clasele nu au putut fi încărcate.", signIn: "Autentifică-te", signInRequired: "Autentifică-te pentru a accesa clasele și temele tale.",
  },
} as const;

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-[var(--sx-radius-control)] bg-muted text-muted-foreground"><Icon className="size-4" aria-hidden="true" /></div><div><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function ClassCard({ item, locale, onOpen }: { item: ClassDirectoryItem; locale: "en" | "ro"; onOpen: () => void }) {
  const c = copy[locale];
  return (
    <Card className="sx-interactive group hover:ring-foreground/20">
      <CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-lg">{item.name}</CardTitle><p className="mt-1 truncate text-sm text-muted-foreground">{item.subject || item.teacherName}{item.schoolYear ? ` · ${item.schoolYear}` : ""}</p></div><Badge variant={item.role === "student" ? "secondary" : "outline"}>{c[item.role]}</Badge></div></CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{item.description || (locale === "ro" ? "Spațiul clasei pentru învățare și colaborare." : "The class workspace for learning and collaboration.")}</p>
        <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-[var(--sx-radius-control)] bg-muted/60 px-3 py-2"><p className="font-medium tabular-nums">{item.assignmentCount}</p><p className="text-xs text-muted-foreground">{c.assignments}</p></div><div className="rounded-[var(--sx-radius-control)] bg-muted/60 px-3 py-2"><p className="font-medium tabular-nums">{item.studentCount}</p><p className="text-xs text-muted-foreground">{c.students}</p></div></div>
        <div><div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{c.progress}</span><span className="font-medium tabular-nums">{item.progress}%</span></div><Progress value={item.progress} /></div>
        <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground"><CalendarClock className="size-3.5" aria-hidden="true" />{item.nextDeadline ? `${c.nextDeadline} ${formatDistanceToNow(new Date(item.nextDeadline), { addSuffix: true, locale: locale === "ro" ? ro : undefined })}` : c.noDeadline}</div>
        <Button variant="outline" className="mt-auto w-full justify-between" onClick={onOpen}>{c.open}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Button>
      </CardContent>
    </Card>
  );
}

export default function ClassesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { locale: activeLocale } = useLanguage();
  const locale = activeLocale === "ro" ? "ro" : "en";
  const c = copy[locale];
  const persona = getWorkspacePersonaFromMetadata(user?.user_metadata) || "learner";
  const canCreate = isAdmin || persona === "teacher";
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | ClassRole>("all");
  const [sort, setSort] = useState<"recent" | "name" | "deadline">("recent");
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [className, setClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const directoryQuery = useQuery({ queryKey: ["classes", "directory", user?.id, isAdmin], queryFn: () => loadClassDirectory(supabase, { userId: user!.id, isAdmin }), enabled: Boolean(user?.id) && !authLoading, staleTime: 120_000 });

  const classes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return [...(directoryQuery.data?.classes || [])].filter((item) => !item.archived).filter((item) => role === "all" || item.role === role).filter((item) => !needle || [item.name, item.subject, item.teacherName].some((value) => value?.toLocaleLowerCase().includes(needle))).sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "deadline") { if (!left.nextDeadline) return 1; if (!right.nextDeadline) return -1; return Date.parse(left.nextDeadline) - Date.parse(right.nextDeadline); }
      return 0;
    });
  }, [directoryQuery.data?.classes, query, role, sort]);

  async function createClass() {
    if (!className.trim()) return;
    setSubmitting(true); const { error } = await supabase.rpc("create_class_secure", { p_name: className.trim() }); setSubmitting(false);
    if (error) return toast.error(error.message);
    setClassName(""); setCreateOpen(false); toast.success(c.created); await queryClient.invalidateQueries({ queryKey: ["classes"] });
  }
  async function joinClass() {
    if (!joinCode.trim()) return;
    setSubmitting(true); const { error } = await supabase.rpc("join_class_secure", { p_invite_code: joinCode.trim().toLowerCase() }); setSubmitting(false);
    if (error) return toast.error(error.message);
    setJoinCode(""); setJoinOpen(false); toast.success(c.joined); await queryClient.invalidateQueries({ queryKey: ["classes"] });
  }

  const totals = directoryQuery.data?.totals;
  return (
    <PageContainer variant="wide" className="sx-page space-y-7">
      <PageHeader title={c.title} subtitle={c.subtitle} action={!user ? <Button onClick={() => router.push("/login")}>{c.signIn}</Button> : <div className="flex gap-2">
        <Dialog open={joinOpen} onOpenChange={setJoinOpen}><DialogTrigger asChild><Button variant="outline">{c.join}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{c.joinTitle}</DialogTitle><DialogDescription>{c.joinDescription}</DialogDescription></DialogHeader><Input autoFocus value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder={c.code} onKeyDown={(event) => event.key === "Enter" && void joinClass()} /><DialogFooter><Button disabled={!joinCode.trim() || submitting} onClick={joinClass}>{c.join}</Button></DialogFooter></DialogContent></Dialog>
        {canCreate && <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button><Plus className="size-4" />{c.create}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{c.createTitle}</DialogTitle><DialogDescription>{c.createDescription}</DialogDescription></DialogHeader><Input autoFocus value={className} onChange={(event) => setClassName(event.target.value)} placeholder={c.className} onKeyDown={(event) => event.key === "Enter" && void createClass()} /><DialogFooter><Button disabled={!className.trim() || submitting} onClick={createClass}>{c.create}</Button></DialogFooter></DialogContent></Dialog>}
      </div>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Class summary"><Metric icon={BookOpen} label={c.active} value={totals?.activeClasses ?? 0} /><Metric icon={CalendarClock} label={c.upcoming} value={totals?.upcomingAssignments ?? 0} /><Metric icon={Users} label={c.overdue} value={totals?.overdueAssignments ?? 0} /><Metric icon={Check} label={c.progress} value={`${totals?.averageProgress ?? 0}%`} /></section>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.search} /></div><div className="flex gap-2"><Select value={role} onValueChange={(value) => setRole(value as typeof role)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{c.allRoles}</SelectItem><SelectItem value="student">{c.student}</SelectItem><SelectItem value="teacher">{c.teacher}</SelectItem>{isAdmin && <SelectItem value="admin">{c.admin}</SelectItem>}</SelectContent></Select><Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">{c.recent}</SelectItem><SelectItem value="name">{c.name}</SelectItem><SelectItem value="deadline">{c.nextDeadline}</SelectItem></SelectContent></Select></div></div>
        {authLoading || (Boolean(user) && directoryQuery.isPending) ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-80 rounded-[var(--sx-radius-card)]" />)}</div> : !user ? <Card className="border-dashed"><CardContent className="py-16 text-center"><BookOpen className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" /><p className="font-medium">{c.signInRequired}</p><Button className="mt-4" onClick={() => router.push("/login")}>{c.signIn}</Button></CardContent></Card> : directoryQuery.isError ? <Card><CardContent className="py-10 text-center"><p className="font-medium">{c.loadError}</p><Button variant="outline" className="mt-4" onClick={() => directoryQuery.refetch()}>{c.retry}</Button></CardContent></Card> : classes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map((item) => <ClassCard key={item.id} item={item} locale={locale} onOpen={() => router.push(`/classes/${item.id}`)} />)}</div> : <Card className="border-dashed"><CardContent className="py-16 text-center"><BookOpen className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" /><p className="font-medium">{c.empty}</p></CardContent></Card>}
      </section>
    </PageContainer>
  );
}
