"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Eye, MessageSquare, Play, Users } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer } from "@/components/layout/PageContainer";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getClassAssignmentProblemIds, type AssignmentRow, type ProfileRow } from "@/lib/class-hub";
import { supabase } from "@/lib/supabase";

type Problem = Record<string, unknown> & { id: string; title: string; description: string };
type Submission = { assignment_id: string; problem_id: string; user_id: string; code?: string; created_at?: string };
type Attempt = { id: string; assignment_id: string; problem_id: string; user_id: string; code: string; attempt_number: number; status: string; score?: number | null; feedback?: string | null; submitted_at: string };
type Member = ProfileRow & { role?: string };
type PageData = { assignment: AssignmentRow; problems: Problem[]; isManager: boolean; members: Member[]; submissions: Submission[]; attempts: Attempt[] };

export default function AssignmentPage() {
  const params = useParams<{ id: string; assignmentId: string }>(); const router = useRouter(); const queryClient = useQueryClient(); const { user, isAdmin, loading: authLoading } = useAuth(); const { locale: activeLocale } = useLanguage(); const locale = activeLocale === "ro" ? "ro" : "en"; const userId = user?.id || null;
  const [reviewOpen, setReviewOpen] = useState(false); const [reviewStudentId, setReviewStudentId] = useState<string | null>(null); const [reviewProblemId, setReviewProblemId] = useState<string | null>(null); const [reviewStatus, setReviewStatus] = useState("accepted"); const [reviewScore, setReviewScore] = useState("100"); const [reviewFeedback, setReviewFeedback] = useState("");
  const queryKey = ["classes", params.id, "assignments", params.assignmentId, userId, locale, isAdmin] as const;
  const pageQuery = useQuery({ queryKey, queryFn: async (): Promise<PageData> => {
    const [assignmentResult, classResult, membershipResult] = await Promise.all([
      supabase.from("assignments").select("*").eq("id", params.assignmentId).maybeSingle(),
      supabase.from("classes").select("teacher_id").eq("id", params.id).maybeSingle(),
      supabase.from("class_members").select("user_id,role").eq("class_id", params.id),
    ]);
    if (assignmentResult.error) throw assignmentResult.error; if (classResult.error) throw classResult.error; if (membershipResult.error) throw membershipResult.error; if (!assignmentResult.data) throw new Error("Assignment not found.");
    const assignment = assignmentResult.data as AssignmentRow; const isManager = Boolean(isAdmin || classResult.data?.teacher_id === userId || membershipResult.data?.some((row) => row.user_id === userId && row.role === "teacher"));
    const memberIds = (membershipResult.data || []).map((row) => row.user_id); const problemIds = getClassAssignmentProblemIds(assignment);
    const [profilesResult, problemsResult, submissionsResult, attemptsResult] = await Promise.all([
      memberIds.length ? supabase.from("profiles").select("id,username,avatar_url,equipped_rewards").in("id", memberIds) : Promise.resolve({ data: [], error: null }),
      problemIds.length ? supabase.from("problems").select("*").in("id", problemIds) : Promise.resolve({ data: [], error: null }),
      isManager ? supabase.from("assignment_problem_submissions").select("*").eq("assignment_id", params.assignmentId) : supabase.from("assignment_problem_submissions").select("*").eq("assignment_id", params.assignmentId).eq("user_id", userId || ""),
      isManager ? supabase.from("class_assignment_attempts").select("*").eq("assignment_id", params.assignmentId).order("attempt_number", { ascending: false }) : supabase.from("class_assignment_attempts").select("*").eq("assignment_id", params.assignmentId).eq("user_id", userId || "").order("attempt_number", { ascending: false }),
    ]);
    if (profilesResult.error) throw profilesResult.error; if (problemsResult.error) throw problemsResult.error; if (submissionsResult.error) throw submissionsResult.error;
    const attemptsUnavailable = attemptsResult.error?.code === "42P01" || attemptsResult.error?.code === "PGRST205"; if (attemptsResult.error && !attemptsUnavailable) throw attemptsResult.error;
    const roleById = new Map((membershipResult.data || []).map((row) => [row.user_id, row.role]));
    const problems = (problemsResult.data || []).map((problem) => ({ ...problem, title: problem.title_i18n?.[locale] || problem.title_i18n?.en || "Untitled", description: problem.description_i18n?.[locale] || problem.description_i18n?.en || "" })) as Problem[];
    const order = new Map(problemIds.map((id, index) => [id, index])); problems.sort((left, right) => (order.get(left.id) || 0) - (order.get(right.id) || 0));
    return { assignment, problems, isManager, members: (profilesResult.data || []).map((profile) => ({ ...profile, role: roleById.get(profile.id) })) as Member[], submissions: (submissionsResult.data || []) as Submission[], attempts: attemptsUnavailable ? [] : (attemptsResult.data || []) as Attempt[] };
  }, enabled: Boolean(userId && params.id && params.assignmentId) && !authLoading, staleTime: 30_000 });
  const page = pageQuery.data; const isPastDeadline = Boolean(page?.assignment.deadline && new Date(page.assignment.deadline) < new Date());
  const studentMembers = useMemo(() => (page?.members || []).filter((member) => member.role !== "teacher" && member.id !== userId), [page?.members, userId]);
  function latestAttempt(studentId: string, problemId: string) { return page?.attempts.find((attempt) => attempt.user_id === studentId && attempt.problem_id === problemId) || null; }
  function openReview(studentId: string, problemId: string) { const attempt = latestAttempt(studentId, problemId); setReviewStudentId(studentId); setReviewProblemId(problemId); setReviewStatus(attempt?.status || "accepted"); setReviewScore(String(attempt?.score ?? 100)); setReviewFeedback(attempt?.feedback || ""); setReviewOpen(true); }
  async function saveReview() { const attempt = reviewStudentId && reviewProblemId ? latestAttempt(reviewStudentId, reviewProblemId) : null; if (!attempt) return; const { error } = await supabase.from("class_assignment_attempts").update({ status: reviewStatus, score: Number(reviewScore) || 0, feedback: reviewFeedback.trim() || null, graded_by: userId, graded_at: new Date().toISOString() }).eq("id", attempt.id); if (error) return toast.error(error.message); toast.success(locale === "ro" ? "Evaluarea a fost salvată." : "Review saved."); setReviewOpen(false); await queryClient.invalidateQueries({ queryKey }); }

  if (pageQuery.isPending) return <PageContainer variant="wide" className="sx-page space-y-4"><Skeleton className="h-9 w-72" /><Skeleton className="h-28" /><Skeleton className="h-[30rem]" /></PageContainer>;
  if (pageQuery.isError || !page) return <PageContainer className="sx-page"><Card><CardContent className="py-12 text-center"><p className="font-medium">{locale === "ro" ? "Tema nu a putut fi încărcată." : "The assignment could not be loaded."}</p><Button variant="outline" className="mt-4" onClick={() => router.push(`/classes/${params.id}`)}>{locale === "ro" ? "Înapoi la clasă" : "Back to class"}</Button></CardContent></Card></PageContainer>;
  const ownCompleted = new Set(page.submissions.filter((row) => row.user_id === userId).map((row) => row.problem_id)); const ownProgress = page.problems.length ? Math.round((ownCompleted.size / page.problems.length) * 100) : 0;
  return <PageContainer variant="wide" className="sx-page space-y-6">
    <Button variant="ghost" size="sm" onClick={() => router.push(`/classes/${params.id}`)}><ArrowLeft className="size-4" />{locale === "ro" ? "Înapoi la clasă" : "Back to class"}</Button>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">{page.assignment.title}</h1><Badge variant={isPastDeadline ? "destructive" : "outline"}>{page.assignment.deadline ? new Date(page.assignment.deadline).toLocaleString() : locale === "ro" ? "Fără termen" : "No deadline"}</Badge></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{page.assignment.description || (locale === "ro" ? "Finalizează problemele pentru a încheia tema." : "Complete the problems to finish this assignment.")}</p></div>{!page.isManager && <div className="min-w-48"><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">{locale === "ro" ? "Progres" : "Progress"}</span><span>{ownProgress}%</span></div><Progress value={ownProgress} /></div>}</div>
    <section className="grid gap-4 lg:grid-cols-2">{page.problems.map((problem, index) => { const solved = ownCompleted.has(problem.id); return <Card key={problem.id}><CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{locale === "ro" ? "Problema" : "Problem"} {index + 1}</p><CardTitle className="mt-1">{problem.title}</CardTitle></div>{!page.isManager && solved && <Badge variant="secondary"><Check className="size-3" />{locale === "ro" ? "Trimisă" : "Submitted"}</Badge>}</div></CardHeader><CardContent className="flex flex-1 flex-col gap-4 py-4"><div className="max-h-64 overflow-y-auto text-sm"><Markdown>{problem.description || (locale === "ro" ? "Fără descriere." : "No description.")}</Markdown></div>{!page.isManager && <Button className="mt-auto w-fit" variant={solved ? "outline" : "default"} onClick={() => router.push(`/classes/${params.id}/assignments/${params.assignmentId}/solve/${problem.id}`)}><Play className="size-4" />{solved ? (locale === "ro" ? "Deschide și retrimite" : "Open and resubmit") : (locale === "ro" ? "Rezolvă" : "Solve")}</Button>}</CardContent></Card>; })}</section>
    {page.isManager && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" />{locale === "ro" ? "Rezultatele elevilor" : "Student results"}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 font-medium">{locale === "ro" ? "Elev" : "Student"}</th>{page.problems.map((problem) => <th key={problem.id} className="pb-3 font-medium">{problem.title}</th>)}<th className="pb-3 font-medium">{locale === "ro" ? "Progres" : "Progress"}</th></tr></thead><tbody>{studentMembers.map((member) => { const completed = page.submissions.filter((row) => row.user_id === member.id).length; const progress = page.problems.length ? Math.min(100, Math.round((completed / page.problems.length) * 100)) : 0; return <tr key={member.id} className="border-b last:border-0"><td className="py-3"><div className="flex items-center gap-2"><UserAvatar avatarUrl={member.avatar_url} username={member.username || "Student"} equippedRewards={member.equipped_rewards as never} className="size-8" /><span className="font-medium">{member.username}</span></div></td>{page.problems.map((problem) => { const attempt = latestAttempt(member.id, problem.id); const submitted = page.submissions.some((row) => row.user_id === member.id && row.problem_id === problem.id); return <td key={problem.id} className="py-3"><Button size="sm" variant="ghost" disabled={!submitted} onClick={() => openReview(member.id, problem.id)}>{attempt?.status === "accepted" ? <Check className="size-4 text-emerald-600" /> : attempt ? <MessageSquare className="size-4" /> : submitted ? <Eye className="size-4" /> : <Clock className="size-4 text-muted-foreground" />}<span>{attempt?.score != null ? `${attempt.score}p` : submitted ? (locale === "ro" ? "Verifică" : "Review") : "—"}</span></Button></td>; })}<td className="py-3"><div className="w-24"><Progress value={progress} /><p className="mt-1 text-xs text-muted-foreground">{progress}%</p></div></td></tr>; })}</tbody></table></CardContent></Card>}
    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{locale === "ro" ? "Evaluează soluția" : "Review solution"}</DialogTitle><DialogDescription>{locale === "ro" ? "Acordă un scor și feedback pentru cea mai recentă încercare." : "Grade and comment on the latest attempt."}</DialogDescription></DialogHeader>{reviewStudentId && reviewProblemId && <div className="space-y-4"><pre className="max-h-72 overflow-auto rounded-[var(--sx-radius-control)] bg-muted p-4 text-xs"><code>{latestAttempt(reviewStudentId, reviewProblemId)?.code || page.submissions.find((row) => row.user_id === reviewStudentId && row.problem_id === reviewProblemId)?.code || "No code"}</code></pre><div className="grid gap-3 sm:grid-cols-2"><Select value={reviewStatus} onValueChange={setReviewStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="rejected">Needs work</SelectItem></SelectContent></Select><Input type="number" min="0" value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} placeholder="Score" /></div><Textarea value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} placeholder={locale === "ro" ? "Feedback pentru elev" : "Feedback for the student"} /></div>}<DialogFooter><Button onClick={saveReview}>{locale === "ro" ? "Salvează evaluarea" : "Save review"}</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}
