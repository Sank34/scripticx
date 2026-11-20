"use client";

import Link from "next/link";
import { clearResumeLesson, rememberResumeLesson } from "@/lib/dashboard-resume";
import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ListChecks, LockKeyhole, PartyPopper, Play, RotateCcw, Terminal, Trophy } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { LessonQuiz } from "@/components/learn/LessonQuiz";
import { useLanguage } from "@/components/LanguageProvider";
import { ComplexityAnalyzerCard } from "@/components/editor/ComplexityAnalyzerCard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoadmapConfig } from "@/hooks/useRoadmapConfig";
import { analyzeMiniScriptComplexity, type ComplexityAnalysis } from "@/lib/complexity-analyzer";
import { advanceLine, parseLine, reset, setVariable, step } from "@/lib/engine";
import { getLessonKind, text, youtubeEmbedUrl, type LessonLocale } from "@/lib/learn-lessons";
import { extractLessonMarkdownHeadings, getLessonMarkdown } from "@/lib/lesson-markdown";
import { refreshLearningPathCompletion } from "@/lib/learning-paths";
import { learningProgressVersion, lessonProgressStorageKey } from "@/lib/learning-progress-version";
import { getRequiredPredecessors, hasPassingLessonQuiz, isLessonCleared } from "@/lib/lesson-progression";
import { getCategoryForLesson } from "@/lib/roadmap-config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StoredProgress = Record<string, { completed?: boolean; lastWatched?: string; quizScore?: number }>;
type LessonProgressRow = { completed: boolean; last_watched_seconds: number | null; quiz_score: number | null; updated_at: string | null };
type LessonStage = "lesson" | "quiz" | "success";

const progressKey = lessonProgressStorageKey;
const copy = {
  en: {
    back: "Back to roadmap", completed: "Completed", minutes: "min", notFound: "Lesson not found", notFoundBody: "This lesson is not available yet.", previous: "Previous lesson", next: "Next lesson",
    videoSoon: "The lesson video will appear here after it is published.", contents: "Lesson contents", noContents: "Add headings to the lesson to build its contents.", finishReading: "Finish reading",
    quizIntro: "Check what you learned in a short quiz, one question at a time. You need every answer correct to pass.", startQuiz: "Take the quiz", quizTitle: "Lesson quiz", loadingProgress: "Checking lesson access…", accessError: "We could not check your progress. Try again before continuing.", lockedTitle: "Complete the earlier lessons first", lockedBody: "Pass the quizzes and any required practice in the earlier lessons to unlock this one.", retry: "Try again", passedTitle: "Quiz passed", passedBody: "Your answers are correct and your progress has been saved.",
    recommended: "Recommended problems", practiceTitle: "Keep the momentum", practiceBody: "These problems reinforce exactly what you just learned.", openPlayground: "Open optional code playground", hidePlayground: "Hide playground",
    playground: "MiniScript+ playground", reset: "Reset", run: "Run code", running: "Running...", sampleInput: "Sample input", output: "Output", noOutput: "Program finished without output.",
    graduationTitle: "Foundation complete", graduationBody: "You finished {path}. Choose the programming language you want to continue with.", chooseLanguage: "Choose a language", later: "Later",
  },
  ro: {
    back: "Înapoi la roadmap", completed: "Finalizată", minutes: "min", notFound: "Lecția nu există", notFoundBody: "Această lecție nu este disponibilă încă.", previous: "Lecția anterioară", next: "Lecția următoare",
    videoSoon: "Videoul lecției va apărea aici după publicare.", contents: "Cuprinsul lecției", noContents: "Adaugă heading-uri în lecție pentru a construi cuprinsul.", finishReading: "Am terminat de citit",
    quizIntro: "Verifică ce ai înțeles într-un quiz scurt, cu câte o întrebare pe ecran. Ai nevoie de toate răspunsurile corecte pentru a promova.", startQuiz: "Începe quiz-ul", quizTitle: "Quiz-ul lecției", loadingProgress: "Se verifică accesul la lecție…", accessError: "Nu am putut verifica progresul. Încearcă din nou înainte de a continua.", lockedTitle: "Finalizează mai întâi lecțiile anterioare", lockedBody: "Treci quiz-urile și rezolvă exercițiile obligatorii din lecțiile anterioare pentru a o debloca pe aceasta.", retry: "Încearcă din nou", passedTitle: "Ai trecut quiz-ul", passedBody: "Răspunsurile tale sunt corecte, iar progresul a fost salvat.",
    recommended: "Probleme recomandate", practiceTitle: "Continuă cu practica", practiceBody: "Problemele acestea consolidează exact ideile pe care tocmai le-ai învățat.", openPlayground: "Deschide editorul opțional", hidePlayground: "Ascunde editorul",
    playground: "Editor MiniScript+", reset: "Resetează", run: "Rulează codul", running: "Rulează...", sampleInput: "Input de test", output: "Output", noOutput: "Programul s-a terminat fără output.",
    graduationTitle: "Fundație finalizată", graduationBody: "Ai terminat {path}. Alege limbajul de programare cu care vrei să continui.", chooseLanguage: "Alege un limbaj", later: "Mai târziu",
  },
} as const;

function readProgress(): StoredProgress {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(progressKey) || "{}"); } catch { return {}; }
}
function writeProgress(progress: StoredProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(progressKey, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("scripticx:lesson-progress", { detail: progress }));
}
function useLessonId() {
  const params = useParams<{ id: string | string[] }>();
  return Array.isArray(params.id) ? params.id[0] : params.id;
}
async function persistLessonProgress(userId: string, lessonId: string, progress: StoredProgress[string]) {
  const timestamp = progress.lastWatched ?? new Date().toISOString();
  const { error } = await supabase.from("lesson_progress").upsert({
    user_id: userId, lesson_id: lessonId, completed: Boolean(progress.completed), completed_at: progress.completed ? timestamp : null,
    last_watched_seconds: 0, quiz_score: progress.quizScore ?? null, updated_at: timestamp,
  }, { onConflict: "user_id,lesson_id" });
  if (error) throw error;
}

export default function LessonPage() {
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const lessonLocale: LessonLocale = locale === "ro" ? "ro" : "en";
  const c = copy[lessonLocale];
  const lessonId = useLessonId();
  const roadmap = useRoadmapConfig();
  const lesson = useMemo(() => roadmap.lessons.find((item) => item.id === lessonId), [lessonId, roadmap.lessons]);
  const categoryLessonIds = useMemo(() => {
    if (!lesson) return [];
    const category = getCategoryForLesson(roadmap.categories, roadmap.sections, lesson.id);
    return category?.sectionIds.flatMap((sectionId) => roadmap.sections.find((section) => section.id === sectionId)?.lessonIds ?? []) ?? [];
  }, [lesson, roadmap.categories, roadmap.sections]);
  const lessonIndex = lesson ? categoryLessonIds.indexOf(lesson.id) : -1;
  const findLesson = (id?: string) => id ? roadmap.lessons.find((item) => item.id === id) ?? null : null;
  const previousLesson = findLesson(categoryLessonIds[lessonIndex - 1]);
  const nextLesson = findLesson(categoryLessonIds[lessonIndex + 1]);
  const predecessors = useMemo(() => getRequiredPredecessors(categoryLessonIds.map(id => roadmap.lessons.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item)), lessonId), [categoryLessonIds, roadmap.lessons, lessonId]);

  const [progress, setProgress] = useState<StoredProgress>({});
  const [stage, setStage] = useState<LessonStage>("lesson");
  const scrollContainer = useRef<HTMLElement>(null);
  const completionHeading = useRef<HTMLHeadingElement>(null);
  const quizLauncher = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [graduatedPathTitle, setGraduatedPathTitle] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (stage === "success") {
      scrollContainer.current?.scrollTo({ top: 0, behavior: "instant" });
      completionHeading.current?.focus({ preventScroll: true });
    }
  }, [stage]);

  useLayoutEffect(() => {
    scrollContainer.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [lessonId]);

  useEffect(() => setProgress(readProgress()), []);
  useEffect(() => {
    if (!lesson) return;
    setStage("lesson"); setCode(lesson.code); setInput(lesson.sampleInput); setOutput("");
  }, [lesson]);

  const userId = user?.id ?? null;
  const { data: remoteProgress } = useQuery({
    queryKey: ["roadmap", "lesson-progress", learningProgressVersion, lesson?.id, userId], enabled: Boolean(lesson && userId) && !authLoading, staleTime: 120_000,
    queryFn: async () => {
      if (!lesson || !userId) return null;
      const { data: lessonRow, error: lessonError } = await supabase.from("lessons").select("id").eq("slug", lesson.id).maybeSingle();
      if (lessonError) throw lessonError;
      if (!lessonRow) return null;
      const { data: row, error } = await supabase.from("lesson_progress").select("completed, last_watched_seconds, quiz_score, updated_at").eq("user_id", userId).eq("lesson_id", lessonRow.id).maybeSingle<LessonProgressRow>();
      if (error) throw error;
      return { lessonDbId: lessonRow.id as string, row };
    },
  });
  const access = useQuery({
    queryKey: ["roadmap", "lesson-access", learningProgressVersion, userId, predecessors.map(item => item.id)],
    enabled: Boolean(userId) && !authLoading && predecessors.length > 0,
    staleTime: 0,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("lessons").select("id, slug").in("slug", predecessors.map(item => item.id));
      if (error) throw error;
      if (rows?.length !== predecessors.length) throw Error("Missing prerequisite lessons");
      const { data: saved, error: progressError } = await supabase.from("lesson_progress").select("lesson_id, completed, quiz_score").eq("user_id", userId!).in("lesson_id", rows.map(row => row.id));
      if (progressError) throw progressError;
      const result: StoredProgress = {};
      for (const row of rows) {
        const entry = saved?.find(item => item.lesson_id === row.id);
        result[row.slug] = { completed: entry?.completed ?? false, quizScore: entry?.quiz_score ?? undefined };
      }
      const requiredCodes = [...new Set(predecessors.flatMap(item => item.unlockRule?.requiredProblemCodes ?? []))];
      const solvedCodes = new Set<number>();
      if (requiredCodes.length) {
        const { data: problems, error: problemError } = await supabase.from("problems").select("id, code").in("code", requiredCodes);
        if (problemError) throw problemError;
        if (problems?.length) {
          const { data: submissions, error: submissionError } = await supabase.from("submissions").select("problem_id").eq("user_id", userId!).gte("score", 100).in("problem_id", problems.map(problem => problem.id));
          if (submissionError) throw submissionError;
          for (const problem of problems) if (submissions?.some(item => item.problem_id === problem.id)) solvedCodes.add(problem.code);
        }
      }
      return { progress: result, solvedCodes: [...solvedCodes] };
    },
  });
  const lessonDbId = remoteProgress?.lessonDbId ?? null;
  useEffect(() => {
    if (!lesson || !remoteProgress?.row) return;
    setProgress((current) => {
      const next = { ...current, [lesson.id]: { completed: remoteProgress.row?.completed, quizScore: remoteProgress.row?.quiz_score ?? undefined, lastWatched: remoteProgress.row?.updated_at ?? undefined } };
      writeProgress(next); return next;
    });
  }, [lesson, remoteProgress]);

  const accessLoading = authLoading || Boolean(userId && predecessors.length && access.isPending);
  const accessFailed = Boolean(userId && predecessors.length && access.isError);
  const accessProgress = userId ? access.data?.progress ?? {} : progress;
  const blockingLesson = predecessors.find(item => !isLessonCleared(item, accessProgress[item.id], new Set(access.data?.solvedCodes ?? [])));
  useEffect(() => {
    if (!userId || !lesson || accessLoading || accessFailed || blockingLesson) return;
    if (remoteProgress?.row?.completed && hasPassingLessonQuiz(lesson, {
      completed: true, quizScore: remoteProgress.row.quiz_score ?? undefined,
    })) {
      clearResumeLesson(userId, lesson.id);
    } else {
      rememberResumeLesson(userId, lesson.id);
    }
  }, [accessFailed, accessLoading, blockingLesson, lesson, remoteProgress, userId]);

  if (roadmap.isLoading) return <main className="flex min-h-[70dvh] items-center justify-center p-6" role="status">{c.loadingProgress}</main>;
  if (roadmap.isError && !roadmap.lessons.length) return <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6"><p role="alert">{c.accessError}</p><Button onClick={() => void roadmap.refetch()}>{c.retry}</Button></main>;

  if (lesson && (accessLoading || accessFailed || blockingLesson)) return <main className="flex min-h-[70dvh] items-center justify-center p-6"><Card className="w-full max-w-md"><CardContent className="space-y-4 p-8 text-center">
    <LockKeyhole className="mx-auto h-6 w-6" aria-hidden="true"/>
    <h1 className="text-xl font-semibold">{accessLoading ? c.loadingProgress : accessFailed ? c.accessError : c.lockedTitle}</h1>
    {!accessLoading && !accessFailed && <p className="text-sm leading-6 text-muted-foreground">{c.lockedBody}</p>}
    {accessFailed && <Button onClick={() => void access.refetch()}>{c.retry}</Button>}
    {!accessLoading && !accessFailed && blockingLesson && <Button asChild><Link href={`/learn/lesson/${blockingLesson.id}`}>{text(blockingLesson.title, lessonLocale)}</Link></Button>}
    <Button asChild variant="outline"><Link href="/learn">{c.back}</Link></Button>
  </CardContent></Card></main>;

  if (!lesson) return <main className="flex min-h-[70dvh] items-center justify-center p-6"><Card className="max-w-md"><CardContent className="space-y-4 p-8 text-center"><ListChecks className="mx-auto h-6 w-6"/><h1 className="text-2xl font-semibold">{c.notFound}</h1><p className="text-muted-foreground">{c.notFoundBody}</p><Button asChild><Link href="/learn">{c.back}</Link></Button></CardContent></Card></main>;

  const activeLessonId = lesson.id;
  const lessonQuiz = lesson.quiz;
  const completed = Boolean(progress[lesson.id]?.completed) && hasPassingLessonQuiz(lesson, progress[lesson.id]);
  const lessonMarkdown = getLessonMarkdown(lesson, lessonLocale);
  const outline = extractLessonMarkdownHeadings(lessonMarkdown);
  const embedUrl = youtubeEmbedUrl(lesson.videoUrl);
  const kind = getLessonKind(lesson);
  const hasPlayground = kind === "challenge" || kind === "interactive";
  const showComplexity = lesson.tags.includes("complexity") || lesson.unit.en === "Complexity Analysis";
  const complexity = showComplexity ? analyzeMiniScriptComplexity(code, lessonLocale) : null;

  async function completeLesson(score: number) {
    if (!lessonQuiz.length || score !== lessonQuiz.length) throw Error("Quiz must be passed before completing a lesson");
    const entry = { completed: true, quizScore: score, lastWatched: new Date().toISOString() };
    if (userId) {
      if (!lessonDbId) throw Error("Lesson progress is not ready");
      await persistLessonProgress(userId, lessonDbId, entry);
      clearResumeLesson(userId, activeLessonId);
    }
    const updated = { ...readProgress(), [activeLessonId]: entry };
    setProgress(updated);
    writeProgress(updated);
    await queryClient.invalidateQueries({ queryKey: ["roadmap", "progress"] });
    await queryClient.invalidateQueries({ queryKey: ["roadmap", "lesson-progress"] });
    await queryClient.invalidateQueries({ queryKey: ["roadmap", "lesson-access"] });
    setStage("success");
    if (!userId || !lessonDbId) return;
    try {
      const result = await refreshLearningPathCompletion({ lessonId: lessonDbId });
      const category = roadmap.categories.find((item) => item.databaseId === result?.pathId);
      if (result?.newlyCompleted && category?.kind === "foundation") setGraduatedPathTitle(text(category.title, lessonLocale));
    } catch (error) { console.error("Could not refresh path completion:", error); }
  }
  function runCode() {
    setIsRunning(true);
    try {
      reset(); const program = code.split("\n").map(parseLine);
      const inputs = input.split(/\s+/).filter(Boolean).map((value) => Number.isNaN(Number(value)) ? value : Number(value));
      const lines: string[] = []; let inputIndex = 0;
      for (let guard = 0; guard < 1000; guard += 1) {
        const result = step(program); if (!result) break;
        if (result.inputRequest) { if (inputIndex >= inputs.length) throw new Error(`Missing input for ${result.inputRequest}`); setVariable(result.inputRequest, inputs[inputIndex++]); advanceLine(); continue; }
        if (result.output !== null && result.output !== undefined) lines.push(String(result.output));
      }
      setOutput(lines.length ? lines.join("\n") : c.noOutput);
    } catch (error) { setOutput(error instanceof Error ? error.message : "Unexpected error"); } finally { setIsRunning(false); }
  }

  const playground = (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><p className="font-semibold">{c.playground}</p><p className="text-xs text-muted-foreground">MiniScript+ · {text(lesson.title, lessonLocale)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setCode(lesson.code); setInput(lesson.sampleInput); setOutput(""); }}><RotateCcw className="h-4 w-4"/>{c.reset}</Button><Button size="sm" onClick={runCode} disabled={isRunning}><Play className="h-4 w-4"/>{isRunning ? c.running : c.run}</Button></div></div>
      <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <MiniScriptMonacoEditor value={code} onChange={setCode} height="420px" options={{ fontSize: 15, minimap: { enabled: false }, padding: { top: 16 }, scrollBeyondLastLine: false, wordWrap: "on" }}/>
        <div className="flex min-h-[360px] flex-col border-t lg:border-l lg:border-t-0"><div className="border-b p-4"><label className="text-sm font-medium text-muted-foreground">{c.sampleInput}</label><textarea value={input} onChange={(event) => setInput(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-lg border bg-background p-3 font-mono text-sm"/></div><div className="flex-1 bg-zinc-950 p-4 text-emerald-300"><p className="mb-3 flex items-center gap-2 text-sm font-medium text-white/50"><Terminal className="h-4 w-4"/>{c.output}</p><pre className="whitespace-pre-wrap font-mono text-sm">{output || ">"}</pre></div></div>
        {showComplexity && <div className="border-t bg-muted/30 p-4 lg:col-span-2"><ComplexityAnalyzerCard analysis={complexity as ComplexityAnalysis | null} compact frame="section"/></div>}
      </div>
    </section>
  );

  return (
    <main ref={scrollContainer} className="note-scrollbar h-full min-h-0 overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-8">
        <Button asChild variant="ghost" size="sm"><Link href="/learn"><ArrowLeft className="h-4 w-4"/>{c.back}</Link></Button>
        <div className="flex items-center gap-2"><Badge variant="outline">{lesson.minutes} {c.minutes}</Badge>{completed && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3"/>{c.completed}</Badge>}</div>
      </header>

      {stage === "lesson" && <div className="mx-auto grid w-full max-w-[1540px] gap-10 px-5 py-10 lg:px-10 xl:grid-cols-[minmax(0,1fr)_270px]">
        <article className="mx-auto min-w-0 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          {embedUrl ? <div className="mb-10 overflow-hidden rounded-2xl border bg-black shadow-sm"><iframe className="aspect-video w-full" src={embedUrl} title={text(lesson.title, lessonLocale)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" allowFullScreen/></div> : lesson.videoUrl ? <div className="mb-10 flex aspect-video items-center justify-center rounded-2xl border bg-muted"><p className="text-muted-foreground">{c.videoSoon}</p></div> : null}
          <div className="mb-10 border-b pb-9"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge variant="secondary">{text(lesson.unit, lessonLocale)}</Badge>{lesson.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div><h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{text(lesson.title, lessonLocale)}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{text(lesson.summary, lessonLocale)}</p></div>
          <div id="lesson-body" className="scroll-mt-24"><Markdown headingAnchors eagerImages className="text-[16px] leading-8 sm:text-[17px] [&_h2]:mt-12 [&_h2]:text-3xl [&_h3]:mt-9 [&_p]:leading-8 [&_pre]:my-6 [&_pre]:rounded-lg">{lessonMarkdown}</Markdown></div>
          {hasPlayground && <div className="mt-10">{playground}</div>}
          <section id="lesson-quiz" className="mt-14 scroll-mt-24 rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-2xl font-semibold">{c.quizTitle}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{c.quizIntro}</p></div>
              <Button ref={quizLauncher} size="lg" className="shrink-0" onClick={() => setStage("quiz")}>{c.startQuiz}<ArrowRight className="size-4"/></Button>
            </div>
          </section>

        </article>
        <aside className="hidden xl:block"><div className="sticky top-24 rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur"><p className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4"/>{c.contents}</p><nav className="mt-4 space-y-1">{outline.length ? outline.map((item) => <a key={item.id} href={`#${item.id}`} className={cn("block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", item.level === 3 && "pl-5 text-xs")}>{item.text}</a>) : <p className="text-xs leading-5 text-muted-foreground">{c.noContents}</p>}<a href="#lesson-quiz" className="mt-3 block rounded-md border-t px-2 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.quizTitle}</a></nav></div></aside>
      </div>}

      {stage === "quiz" && <LessonQuiz key={lesson.id} questions={lessonQuiz} locale={lessonLocale} lessonTitle={text(lesson.title, lessonLocale)} onPassed={completeLesson} onExit={() => { setStage("lesson"); requestAnimationFrame(() => quizLauncher.current?.focus({ preventScroll: true })); }}/>}

      {stage === "success" && <section className="mx-auto min-h-[calc(100dvh-7.5rem)] w-full max-w-6xl px-5 py-12 sm:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[var(--sx-radius-panel)] bg-emerald-600 text-white shadow-sm"><PartyPopper className="h-11 w-11"/></div><p className="mt-7 text-sm font-semibold text-emerald-600">{`${lessonQuiz.length}/${lessonQuiz.length}`}</p><h1 ref={completionHeading} tabIndex={-1} className="outline-none mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{c.passedTitle}</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{c.passedBody}</p></div>
        {lesson.recommendedProblems.length > 0 && <div className="mx-auto mt-14 max-w-4xl"><div className="mb-6"><p className="text-sm font-semibold text-emerald-600">{c.recommended}</p><h2 className="mt-2 text-2xl font-semibold">{c.practiceTitle}</h2><p className="mt-2 text-muted-foreground">{c.practiceBody}</p></div><div className="grid gap-3 md:grid-cols-3">{lesson.recommendedProblems.map((problem, index) => <Link key={`${problem.href}-${index}`} href={problem.href} className="group rounded-xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-600">{index + 1}</span>{problem.difficulty && <Badge variant="secondary" className="capitalize">{problem.difficulty}</Badge>}</div><h3 className="mt-5 font-semibold group-hover:text-emerald-600">{problem.code ? `#${problem.code} ` : ""}{text(problem.title, lessonLocale)}</h3><p className="mt-1 text-xs text-muted-foreground">{problem.topic}</p></Link>)}</div></div>}
        <div className="mx-auto mt-12 flex max-w-4xl flex-col-reverse gap-3 border-t pt-7 sm:flex-row sm:justify-between">{previousLesson ? <Button asChild variant="outline"><Link href={`/learn/lesson/${previousLesson.id}`}><ArrowLeft className="h-4 w-4"/>{c.previous}</Link></Button> : <span/>}{nextLesson ? <Button asChild size="lg"><Link href={`/learn/lesson/${nextLesson.id}`}>{c.next}<ArrowRight className="h-4 w-4"/></Link></Button> : <Button asChild size="lg"><Link href="/learn"><Trophy className="h-4 w-4"/>{c.back}</Link></Button>}</div>
      </section>}

      <Dialog open={Boolean(graduatedPathTitle)} onOpenChange={(open) => { if (!open) setGraduatedPathTitle(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{c.graduationTitle}</DialogTitle><DialogDescription>{c.graduationBody.replace("{path}", graduatedPathTitle ?? "MiniScript+")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setGraduatedPathTitle(null)}>{c.later}</Button><Button asChild><Link href="/learn/paths">{c.chooseLanguage}</Link></Button></DialogFooter></DialogContent></Dialog>
    </main>
  );
}
