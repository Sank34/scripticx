"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Send } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { useLanguage } from "@/components/LanguageProvider";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProblemEditorDraft } from "@/hooks/useProblemEditorDraft";
import { supabase } from "@/lib/supabase";

type Submission = { code?: string | null; created_at?: string | null };
type Attempt = { id: string; code: string; attempt_number: number; status: string; score?: number | null; feedback?: string | null; submitted_at: string };
type SolvePageData = { assignment: Record<string, unknown> | null; problem: Record<string, unknown> | null; submission: Submission | null; attempts: Attempt[] };

export default function SolvePage() {
  const params = useParams<{ id: string; assignmentId: string; problemId: string }>();
  const router = useRouter(); const { locale } = useLanguage(); const language = locale === "ro" ? "ro" : "en"; const { user, loading: authLoading } = useAuth(); const queryClient = useQueryClient();
  const [code, setCode] = useState(""); const [submitting, setSubmitting] = useState(false); const userId = user?.id || null;
  const queryKey = ["classes", "assignment-solve", params.assignmentId, params.problemId, userId, language] as const;
  const pageQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<SolvePageData> => {
      const [assignmentResult, problemResult, submissionResult, attemptsResult] = await Promise.all([
        supabase.from("assignments").select("*").eq("id", params.assignmentId).maybeSingle(),
        supabase.from("problems").select("*").eq("id", params.problemId).maybeSingle(),
        userId ? supabase.from("assignment_problem_submissions").select("*").eq("assignment_id", params.assignmentId).eq("user_id", userId).eq("problem_id", params.problemId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        userId ? supabase.from("class_assignment_attempts").select("*").eq("assignment_id", params.assignmentId).eq("problem_id", params.problemId).eq("user_id", userId).order("attempt_number", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (assignmentResult.error) throw assignmentResult.error; if (problemResult.error) throw problemResult.error; if (submissionResult.error) throw submissionResult.error;
      const attemptsUnavailable = attemptsResult.error?.code === "42P01" || attemptsResult.error?.code === "PGRST205";
      if (attemptsResult.error && !attemptsUnavailable) throw attemptsResult.error;
      const problem = problemResult.data as Record<string, unknown> | null;
      const titleI18n = problem?.title_i18n as Record<string, string> | undefined; const descriptionI18n = problem?.description_i18n as Record<string, string> | undefined;
      return { assignment: assignmentResult.data, problem: problem ? { ...problem, title: titleI18n?.[language] || titleI18n?.en || "Untitled", description: descriptionI18n?.[language] || descriptionI18n?.en || "" } : null, submission: submissionResult.data, attempts: attemptsUnavailable ? [] : (attemptsResult.data || []) as Attempt[] };
    },
    enabled: Boolean(params.assignmentId && params.problemId && userId) && !authLoading,
    staleTime: 30_000,
  });
  const page = pageQuery.data; const assignment = page?.assignment; const problem = page?.problem; const attempts = useMemo(() => page?.attempts || [], [page?.attempts]); const previousSubmission = Boolean(page?.submission);

  const draftSync = useProblemEditorDraft({ code, fallbackCode: page ? attempts[0]?.code || page.submission?.code || "" : null, onHydrate: setCode, problemId: params.problemId, scopeKey: `assignment:${params.assignmentId}`, userId });

  async function handleSubmit() {
    if (!code.trim() || !userId || !assignment || !problem) return;
    setSubmitting(true);
    const attemptResult = await supabase.rpc("submit_class_assignment_attempt", { p_assignment_id: params.assignmentId, p_problem_id: params.problemId, p_code: code, p_language: "miniscript" });
    const rpcUnavailable = attemptResult.error && ["42883", "PGRST202"].includes(attemptResult.error.code || "");
    if (attemptResult.error && !rpcUnavailable) { setSubmitting(false); toast.error(attemptResult.error.message); return; }
    const canonicalResult = await supabase.from("assignment_problem_submissions").upsert({ assignment_id: params.assignmentId, problem_id: params.problemId, user_id: userId, code }, { onConflict: "assignment_id,problem_id,user_id" });
    setSubmitting(false); if (canonicalResult.error) return toast.error(canonicalResult.error.message);
    toast.success(language === "ro" ? "Soluția a fost trimisă." : "Solution submitted.");
    await Promise.all([queryClient.invalidateQueries({ queryKey }), queryClient.invalidateQueries({ queryKey: ["classes", params.id, "assignments", params.assignmentId] }), queryClient.invalidateQueries({ queryKey: ["classes", "hub", params.id] })]);
  }

  if (pageQuery.isPending) return <PageContainer variant="wide" className="sx-page space-y-4"><Skeleton className="h-8 w-64" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-[38rem]" /><Skeleton className="h-[38rem]" /></div></PageContainer>;
  if (pageQuery.isError || !assignment || !problem) return <PageContainer className="sx-page"><Card><CardContent className="py-12 text-center"><p className="font-medium">{language === "ro" ? "Problema nu a putut fi încărcată." : "The problem could not be loaded."}</p><Button variant="outline" className="mt-4" onClick={() => router.back()}>{language === "ro" ? "Înapoi" : "Back"}</Button></CardContent></Card></PageContainer>;

  const maxAttempts = assignment.max_attempts as number | null | undefined; const attemptCount = attempts.length || (previousSubmission ? 1 : 0); const canSubmit = !maxAttempts || attemptCount < maxAttempts;
  return <PageContainer variant="wide" className="sx-page space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={() => router.push(`/classes/${params.id}/assignments/${params.assignmentId}`)}><ArrowLeft className="size-4" />{language === "ro" ? "Înapoi la temă" : "Back to assignment"}</Button><div className="flex items-center gap-2">{previousSubmission && <Badge variant="secondary"><Check className="size-3" />{language === "ro" ? "Trimisă" : "Submitted"}</Badge>}<Badge variant="outline">{language === "ro" ? "Încercări" : "Attempts"}: {attemptCount}{maxAttempts ? ` / ${maxAttempts}` : ""}</Badge></div></div>
    <div><h1 className="text-3xl font-semibold tracking-tight">{String(assignment.title || "Assignment")}</h1><p className="mt-2 text-sm text-muted-foreground">{String(problem.title || "Problem")}</p></div>
    <div className="grid min-h-[38rem] gap-4 lg:grid-cols-2">
      <Card className="min-h-[38rem]"><CardHeader className="border-b"><CardTitle>{String(problem.title || "Problem")}</CardTitle></CardHeader><CardContent className="min-h-0 flex-1 overflow-y-auto py-5"><Markdown>{String(problem.description || (language === "ro" ? "Problema nu are descriere." : "This problem has no description."))}</Markdown></CardContent></Card>
      <Card className="min-h-[38rem]"><CardHeader className="border-b"><div className="flex items-center justify-between"><CardTitle>{language === "ro" ? "Soluția ta" : "Your solution"}</CardTitle><Badge variant="outline">MS+</Badge></div></CardHeader><CardContent className="flex min-h-0 flex-1 flex-col gap-4 py-4"><div className="min-h-[28rem] flex-1 overflow-hidden rounded-[var(--sx-radius-control)] border"><MiniScriptMonacoEditor key={String(problem.id)} height="100%" value={code} onChange={setCode} options={{ padding: { top: 16, bottom: 16 }, smoothScrolling: true, wordWrap: "on", automaticLayout: true, cursorSmoothCaretAnimation: "on", cursorBlinking: "smooth", glyphMargin: true, minimap: { enabled: false }, scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }, tabSize: 2, insertSpaces: true, wrappingIndent: "same" }} /></div>{draftSync.conflict ? <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><span>{language === "ro" ? "Ciorna s-a schimbat pe alt dispozitiv." : "The draft changed on another device."}</span><Button size="sm" variant="outline" onClick={() => void draftSync.resolveConflict("cloud")}>{language === "ro" ? "Folosește cloud" : "Use cloud"}</Button><Button size="sm" onClick={() => void draftSync.resolveConflict("local").catch(() => toast.error(language === "ro" ? "Ciorna s-a schimbat din nou." : "The draft changed again."))}>{language === "ro" ? "Păstrează aici" : "Keep this"}</Button></div> : null}<div className="flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">{canSubmit ? (previousSubmission ? (language === "ro" ? "Poți trimite o versiune nouă." : "You can submit a new revision.") : (language === "ro" ? "Soluția va fi salvată în istoric." : "The solution will be added to attempt history.")) : (language === "ro" ? "Ai atins numărul maxim de încercări." : "Maximum attempts reached.")}</p><p className={`mt-1 text-xs ${draftSync.state === "synced" ? "text-emerald-600" : "text-muted-foreground"}`}>{draftSync.state === "saving" ? (language === "ro" ? "Se salvează…" : "Saving…") : draftSync.state === "synced" ? (language === "ro" ? "Sincronizat" : "Synced") : (language === "ro" ? "Nesincronizat" : "Not synced")}</p></div><Button onClick={handleSubmit} disabled={submitting || !code.trim() || !canSubmit}><Send className="size-4" />{previousSubmission ? (language === "ro" ? "Trimite din nou" : "Submit revision") : (language === "ro" ? "Trimite" : "Submit")}</Button></div></CardContent></Card>
    </div>
    {attempts.length > 0 && <Card><CardHeader><CardTitle>{language === "ro" ? "Istoric încercări" : "Attempt history"}</CardTitle></CardHeader><CardContent className="divide-y">{attempts.map((attempt) => <div key={attempt.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{language === "ro" ? "Încercarea" : "Attempt"} {attempt.attempt_number}</p><p className="text-xs text-muted-foreground">{new Date(attempt.submitted_at).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{attempt.status}</Badge>{attempt.score != null && <Badge variant="secondary">{attempt.score}p</Badge>}</div></div>)}</CardContent></Card>}
  </PageContainer>;
}
