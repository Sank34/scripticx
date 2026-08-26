"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Code2, ListChecks, LockKeyhole, PartyPopper, Play, RotateCcw, Terminal, Trophy } from "lucide-react";

import { Markdown } from "@/components/Markdown";
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
import { getLessonById, getLessonKind, text, youtubeEmbedUrl, type LessonLocale, type LessonQuizQuestion } from "@/lib/learn-lessons";
import { extractLessonMarkdownHeadings, getLessonMarkdown } from "@/lib/lesson-markdown";
import { refreshLearningPathCompletion } from "@/lib/learning-paths";
import { getCategoryForLesson } from "@/lib/roadmap-config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StoredProgress = Record<string, { completed?: boolean; lastWatched?: string; quizScore?: number }>;
type LessonProgressRow = { completed: boolean; last_watched_seconds: number | null; quiz_score: number | null; updated_at: string | null };
type DisplayQuizQuestion = LessonQuizQuestion & { originalIndex: number };
type LessonStage = "lesson" | "ready" | "quiz" | "success";

const progressKey = "scripticx.lessonProgress.v1";
const copy = {
  en: {
    back: "Back to roadmap", completed: "Completed", minutes: "min", notFound: "Lesson not found", notFoundBody: "This lesson is not available yet.", previous: "Previous lesson", next: "Next lesson",
    videoSoon: "The lesson video will appear here after it is published.", contents: "Lesson contents", noContents: "Add headings to the lesson to build its contents.", finishReading: "Finish reading",
    readyTitle: "You finished the lesson", readyBody: "Nice work. A short quiz is next so you can make sure the idea is clear before moving on.", startQuiz: "Take the quiz",
    question: "Question", of: "of", continue: "Continue", checkQuiz: "Check my answers", perfectRequired: "You need 100% to unlock the next lesson.", retryTitle: "Almost there",
    retryBody: "Review the answers and try again. You can repeat the quiz as many times as you need.", retry: "Try again", passedTitle: "Hooray, you passed!", passedBody: "You understood the lesson and unlocked what comes next.",
    recommended: "Recommended problems", practiceTitle: "Keep the momentum", practiceBody: "These problems reinforce exactly what you just learned.", openPlayground: "Open optional code playground", hidePlayground: "Hide playground",
    playground: "MiniScript+ playground", reset: "Reset", run: "Run code", running: "Running...", sampleInput: "Sample input", output: "Output", noOutput: "Program finished without output.",
    graduationTitle: "Foundation complete", graduationBody: "You finished {path}. Choose the programming language you want to continue with.", chooseLanguage: "Choose a language", later: "Later",
  },
  ro: {
    back: "Înapoi la roadmap", completed: "Finalizată", minutes: "min", notFound: "Lecția nu există", notFoundBody: "Această lecție nu este disponibilă încă.", previous: "Lecția anterioară", next: "Lecția următoare",
    videoSoon: "Videoul lecției va apărea aici după publicare.", contents: "Cuprinsul lecției", noContents: "Adaugă heading-uri în lecție pentru a construi cuprinsul.", finishReading: "Am terminat de citit",
    readyTitle: "Ai terminat lecția", readyBody: "Foarte bine. Urmează un quiz scurt ca să confirmi că ideea este clară înainte să mergi mai departe.", startQuiz: "Începe quiz-ul",
    question: "Întrebarea", of: "din", continue: "Continuă", checkQuiz: "Verifică răspunsurile", perfectRequired: "Ai nevoie de 100% pentru a debloca lecția următoare.", retryTitle: "Aproape ai reușit",
    retryBody: "Recitește răspunsurile și încearcă din nou. Poți repeta quiz-ul de câte ori ai nevoie.", retry: "Încearcă din nou", passedTitle: "Hooray, ai trecut!", passedBody: "Ai înțeles lecția și ai deblocat pasul următor.",
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
function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
function randomizeQuiz(quiz: LessonQuizQuestion[]): DisplayQuizQuestion[] {
  return shuffleArray(quiz.map((question, originalIndex) => {
    const options = shuffleArray(question.options.map((option, optionIndex) => ({ option, optionIndex })));
    return { ...question, originalIndex, options: options.map((item) => item.option), answerIndex: options.findIndex((item) => item.optionIndex === question.answerIndex) };
  }));
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
  const { user, loading: authLoading } = useAuth();
  const lessonLocale = (locale === "ro" ? "ro" : "en") as LessonLocale;
  const c = copy[lessonLocale];
  const lessonId = useLessonId();
  const roadmap = useRoadmapConfig();
  const lesson = useMemo(() => roadmap.lessons.find((item) => item.id === lessonId) ?? getLessonById(lessonId), [lessonId, roadmap.lessons]);
  const categoryLessonIds = useMemo(() => {
    if (!lesson) return [];
    const category = getCategoryForLesson(roadmap.categories, roadmap.sections, lesson.id);
    return category?.sectionIds.flatMap((sectionId) => roadmap.sections.find((section) => section.id === sectionId)?.lessonIds ?? []) ?? [];
  }, [lesson, roadmap.categories, roadmap.sections]);
  const lessonIndex = lesson ? categoryLessonIds.indexOf(lesson.id) : -1;
  const findLesson = (id?: string) => id ? roadmap.lessons.find((item) => item.id === id) ?? getLessonById(id) ?? null : null;
  const previousLesson = findLesson(categoryLessonIds[lessonIndex - 1]);
  const nextLesson = findLesson(categoryLessonIds[lessonIndex + 1]);

  const [progress, setProgress] = useState<StoredProgress>({});
  const [stage, setStage] = useState<LessonStage>("lesson");
  const [quizQuestions, setQuizQuestions] = useState<DisplayQuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [graduatedPathTitle, setGraduatedPathTitle] = useState<string | null>(null);

  useEffect(() => setProgress(readProgress()), []);
  useEffect(() => {
    if (!lesson) return;
    setStage("lesson"); setQuizQuestions(randomizeQuiz(lesson.quiz)); setQuizAnswers({}); setQuizSubmitted(false);
    setCurrentQuizIndex(0); setPlaygroundOpen(false); setCode(lesson.code); setInput(lesson.sampleInput); setOutput("");
  }, [lesson]);

  const userId = user?.id ?? null;
  const { data: remoteProgress } = useQuery({
    queryKey: ["roadmap", "lesson-progress", lesson?.id, userId], enabled: Boolean(lesson && userId) && !authLoading, staleTime: 120_000,
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
  const lessonDbId = remoteProgress?.lessonDbId ?? null;
  useEffect(() => {
    if (!lesson || !remoteProgress?.row) return;
    setProgress((current) => {
      const next = { ...current, [lesson.id]: { completed: remoteProgress.row?.completed, quizScore: remoteProgress.row?.quiz_score ?? undefined, lastWatched: remoteProgress.row?.updated_at ?? undefined } };
      writeProgress(next); return next;
    });
  }, [lesson, remoteProgress]);

  if (!lesson) return <main className="flex min-h-[70dvh] items-center justify-center p-6"><Card className="max-w-md"><CardContent className="space-y-4 p-8 text-center"><ListChecks className="mx-auto h-6 w-6"/><h1 className="text-2xl font-semibold">{c.notFound}</h1><p className="text-muted-foreground">{c.notFoundBody}</p><Button asChild><Link href="/learn">{c.back}</Link></Button></CardContent></Card></main>;

  const activeLessonId = lesson.id;
  const lessonQuiz = lesson.quiz;
  const completed = Boolean(progress[lesson.id]?.completed);
  const lessonMarkdown = getLessonMarkdown(lesson, lessonLocale);
  const outline = extractLessonMarkdownHeadings(lessonMarkdown);
  const embedUrl = youtubeEmbedUrl(lesson.videoUrl);
  const kind = getLessonKind(lesson);
  const hasPlayground = kind === "challenge" || kind === "interactive";
  const quizScore = quizQuestions.reduce((score, question, index) => score + (quizAnswers[index] === question.answerIndex ? 1 : 0), 0);
  const currentQuestion = quizQuestions[currentQuizIndex];
  const showComplexity = lesson.tags.includes("complexity") || lesson.unit.en === "Complexity Analysis";
  const complexity = showComplexity ? analyzeMiniScriptComplexity(code, lessonLocale) : null;

  function saveProgress(update: StoredProgress[string]) {
    const next = { ...progress, [activeLessonId]: { ...progress[activeLessonId], ...update, lastWatched: new Date().toISOString() } };
    setProgress(next); writeProgress(next);
    if (userId && lessonDbId) void persistLessonProgress(userId, lessonDbId, next[activeLessonId]).catch(console.error);
    return next;
  }
  async function completeLesson(score?: number) {
    const next = saveProgress({ completed: true, quizScore: score });
    if (!userId || !lessonDbId) return;
    try {
      await persistLessonProgress(userId, lessonDbId, next[activeLessonId]);
      const result = await refreshLearningPathCompletion({ lessonId: lessonDbId });
      const category = roadmap.categories.find((item) => item.databaseId === result?.pathId);
      if (result?.newlyCompleted && category?.kind === "foundation") setGraduatedPathTitle(text(category.title, lessonLocale));
    } catch (error) { console.error("Could not complete lesson:", error); }
  }
  async function submitQuiz() {
    setQuizSubmitted(true); saveProgress({ quizScore });
    if (quizScore === quizQuestions.length) { await completeLesson(quizScore); setStage("success"); }
  }
  function retryQuiz() {
    setQuizQuestions(randomizeQuiz(lessonQuiz)); setQuizAnswers({}); setQuizSubmitted(false); setCurrentQuizIndex(0);
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
      setOutput(lines.length ? lines.join("\n") : c.noOutput); saveProgress({});
    } catch (error) { setOutput(error instanceof Error ? error.message : "Unexpected error"); } finally { setIsRunning(false); }
  }

  const playground = (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><p className="font-semibold">{c.playground}</p><p className="text-xs text-muted-foreground">MiniScript+ · {text(lesson.title, lessonLocale)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setCode(lesson.code); setInput(lesson.sampleInput); setOutput(""); }}><RotateCcw className="h-4 w-4"/>{c.reset}</Button><Button size="sm" onClick={runCode} disabled={isRunning}><Play className="h-4 w-4"/>{isRunning ? c.running : c.run}</Button></div></div>
      <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <MiniScriptMonacoEditor value={code} onChange={setCode} height="420px" options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on" }}/>
        <div className="flex min-h-[360px] flex-col border-t lg:border-l lg:border-t-0"><div className="border-b p-4"><label className="text-sm font-medium text-muted-foreground">{c.sampleInput}</label><textarea value={input} onChange={(event) => setInput(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-lg border bg-background p-3 font-mono text-sm"/></div><div className="flex-1 bg-zinc-950 p-4 text-emerald-300"><p className="mb-3 flex items-center gap-2 text-sm font-medium text-white/50"><Terminal className="h-4 w-4"/>{c.output}</p><pre className="whitespace-pre-wrap font-mono text-sm">{output || ">"}</pre></div></div>
        {showComplexity && <div className="border-t bg-muted/30 p-4 lg:col-span-2"><ComplexityAnalyzerCard analysis={complexity as ComplexityAnalysis | null} compact frame="section"/></div>}
      </div>
    </section>
  );

  return (
    <main className="note-scrollbar min-h-[calc(100dvh-4rem)] overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-8">
        <Button asChild variant="ghost" size="sm"><Link href="/learn"><ArrowLeft className="h-4 w-4"/>{c.back}</Link></Button>
        <div className="flex items-center gap-2"><Badge variant="outline">{lesson.minutes} {c.minutes}</Badge>{completed && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3"/>{c.completed}</Badge>}</div>
      </header>

      {stage === "lesson" && <div className="mx-auto grid w-full max-w-[1540px] gap-10 px-5 py-10 lg:px-10 xl:grid-cols-[minmax(0,1fr)_270px]">
        <article className="mx-auto min-w-0 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          {embedUrl ? <div className="mb-10 overflow-hidden rounded-2xl border bg-black shadow-sm"><iframe className="aspect-video w-full" src={embedUrl} title={text(lesson.title, lessonLocale)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" allowFullScreen/></div> : lesson.videoUrl ? <div className="mb-10 flex aspect-video items-center justify-center rounded-2xl border bg-muted"><p className="text-muted-foreground">{c.videoSoon}</p></div> : null}
          <div className="mb-10 border-b pb-9"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge variant="secondary">{text(lesson.unit, lessonLocale)}</Badge>{lesson.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div><h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{text(lesson.title, lessonLocale)}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{text(lesson.summary, lessonLocale)}</p></div>
          <Markdown headingAnchors eagerImages className="text-[16px] leading-8 sm:text-[17px] [&_h2]:mt-12 [&_h2]:text-3xl [&_h3]:mt-9 [&_p]:leading-8 [&_pre]:my-6 [&_pre]:rounded-lg">{lessonMarkdown}</Markdown>
          {hasPlayground && <div className="mt-10">{playground}</div>}
          <section className="mt-14 overflow-hidden rounded-2xl border bg-zinc-950 p-7 text-white shadow-sm sm:p-9"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-emerald-300">{c.question} 01</p><h2 className="mt-2 text-2xl font-semibold">{c.readyTitle}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/60">{c.perfectRequired}</p></div><Button className="h-11 bg-white text-black hover:bg-white/90" onClick={() => setStage(completed ? "success" : "ready")}>{c.finishReading}<ArrowRight className="h-4 w-4"/></Button></div></section>
        </article>
        <aside className="hidden xl:block"><div className="sticky top-24 rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur"><p className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4"/>{c.contents}</p><nav className="mt-4 space-y-1">{outline.length ? outline.map((item) => <a key={item.id} href={`#${item.id}`} className={cn("block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", item.level === 3 && "pl-5 text-xs")}>{item.text}</a>) : <p className="text-xs leading-5 text-muted-foreground">{c.noContents}</p>}</nav></div></aside>
      </div>}

      {stage === "ready" && <section className="flex min-h-[calc(100dvh-7.5rem)] items-center justify-center px-5 py-12 animate-in fade-in zoom-in-95 duration-500"><div className="w-full max-w-2xl text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-sm"><BookOpen className="h-9 w-9 text-emerald-600"/></div><p className="mt-7 text-sm font-semibold text-emerald-600">{text(lesson.unit, lessonLocale)}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{c.readyTitle}</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{c.readyBody}</p><div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl border bg-muted/35 p-4 text-left"><LockKeyhole className="h-5 w-5 shrink-0 text-amber-500"/><p className="text-sm">{c.perfectRequired}</p></div><div className="mt-9 flex justify-center gap-3"><Button variant="outline" onClick={() => setStage("lesson")}>{c.back}</Button><Button size="lg" onClick={async () => { if (quizQuestions.length) setStage("quiz"); else { await completeLesson(); setStage("success"); } }}>{c.startQuiz}<ChevronRight className="h-4 w-4"/></Button></div></div></section>}

      {stage === "quiz" && <section className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-3xl"><div className="flex items-center justify-between text-sm"><span className="font-medium">{c.question} {Math.min(currentQuizIndex + 1, quizQuestions.length)} {c.of} {quizQuestions.length}</span><span className="text-muted-foreground">{Math.round((Object.keys(quizAnswers).length / Math.max(quizQuestions.length, 1)) * 100)}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(Object.keys(quizAnswers).length / Math.max(quizQuestions.length, 1)) * 100}%` }}/></div></div>
        {!quizSubmitted && currentQuestion && <div key={currentQuizIndex} className="mx-auto my-auto w-full max-w-3xl py-10 animate-in fade-in slide-in-from-right-5 duration-300"><div className="mb-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40"><ListChecks className="h-5 w-5"/></div><h1 className="mt-5 text-2xl font-semibold leading-tight sm:text-3xl">{text(currentQuestion.question, lessonLocale)}</h1></div><div className="grid gap-3 sm:grid-cols-2">{currentQuestion.options.map((option, optionIndex) => { const selected = quizAnswers[currentQuizIndex] === optionIndex; return <button key={`${currentQuizIndex}-${optionIndex}`} type="button" onClick={() => setQuizAnswers((current) => ({ ...current, [currentQuizIndex]: optionIndex }))} className={cn("group min-h-20 rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md", selected && "border-emerald-500 bg-emerald-500/8 ring-2 ring-emerald-500/20")}><span className="flex items-center gap-3"><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", selected && "border-emerald-500 bg-emerald-500 text-white")}>{selected ? <Check className="h-4 w-4"/> : String.fromCharCode(65 + optionIndex)}</span><span className="font-medium">{text(option, lessonLocale)}</span></span></button>; })}</div><div className="mt-8 flex justify-end"><Button size="lg" disabled={quizAnswers[currentQuizIndex] === undefined} onClick={() => currentQuizIndex < quizQuestions.length - 1 ? setCurrentQuizIndex((value) => value + 1) : void submitQuiz()}>{currentQuizIndex < quizQuestions.length - 1 ? c.continue : c.checkQuiz}<ArrowRight className="h-4 w-4"/></Button></div></div>}
        {quizSubmitted && quizScore < quizQuestions.length && <div className="mx-auto my-auto w-full max-w-2xl py-12 text-center animate-in fade-in zoom-in-95 duration-300"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600"><RotateCcw className="h-9 w-9"/></div><h1 className="mt-6 text-4xl font-semibold">{c.retryTitle}</h1><p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-muted-foreground">{c.retryBody}</p><p className="mt-5 text-2xl font-semibold">{quizScore}/{quizQuestions.length}</p><p className="mt-1 text-sm text-muted-foreground">{c.perfectRequired}</p><Button size="lg" className="mt-8" onClick={retryQuiz}><RotateCcw className="h-4 w-4"/>{c.retry}</Button></div>}
        {hasPlayground && <div className="mx-auto w-full max-w-5xl pb-8"><Button variant="ghost" className="mx-auto flex" onClick={() => setPlaygroundOpen((value) => !value)}><Code2 className="h-4 w-4"/>{playgroundOpen ? c.hidePlayground : c.openPlayground}</Button>{playgroundOpen && <div className="mt-4 animate-in fade-in slide-in-from-bottom-3">{playground}</div>}</div>}
      </section>}

      {stage === "success" && <section className="mx-auto min-h-[calc(100dvh-7.5rem)] w-full max-w-6xl px-5 py-12 sm:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[var(--sx-radius-panel)] bg-emerald-600 text-white shadow-sm"><PartyPopper className="h-11 w-11"/></div><p className="mt-7 text-sm font-semibold text-emerald-600">{quizQuestions.length ? `${quizQuestions.length}/${quizQuestions.length}` : c.completed}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{c.passedTitle}</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{c.passedBody}</p></div>
        {lesson.recommendedProblems.length > 0 && <div className="mx-auto mt-14 max-w-4xl"><div className="mb-6"><p className="text-sm font-semibold text-emerald-600">{c.recommended}</p><h2 className="mt-2 text-2xl font-semibold">{c.practiceTitle}</h2><p className="mt-2 text-muted-foreground">{c.practiceBody}</p></div><div className="grid gap-3 md:grid-cols-3">{lesson.recommendedProblems.map((problem, index) => <Link key={`${problem.href}-${index}`} href={problem.href} className="group rounded-xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-600">{index + 1}</span>{problem.difficulty && <Badge variant="secondary" className="capitalize">{problem.difficulty}</Badge>}</div><h3 className="mt-5 font-semibold group-hover:text-emerald-600">{problem.code ? `#${problem.code} ` : ""}{text(problem.title, lessonLocale)}</h3><p className="mt-1 text-xs text-muted-foreground">{problem.topic}</p></Link>)}</div></div>}
        <div className="mx-auto mt-12 flex max-w-4xl flex-col-reverse gap-3 border-t pt-7 sm:flex-row sm:justify-between">{previousLesson ? <Button asChild variant="outline"><Link href={`/learn/lesson/${previousLesson.id}`}><ArrowLeft className="h-4 w-4"/>{c.previous}</Link></Button> : <span/>}{nextLesson ? <Button asChild size="lg"><Link href={`/learn/lesson/${nextLesson.id}`}>{c.next}<ArrowRight className="h-4 w-4"/></Link></Button> : <Button asChild size="lg"><Link href="/learn"><Trophy className="h-4 w-4"/>{c.back}</Link></Button>}</div>
      </section>}

      <Dialog open={Boolean(graduatedPathTitle)} onOpenChange={(open) => { if (!open) setGraduatedPathTitle(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{c.graduationTitle}</DialogTitle><DialogDescription>{c.graduationBody.replace("{path}", graduatedPathTitle ?? "MiniScript+")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setGraduatedPathTitle(null)}>{c.later}</Button><Button asChild><Link href="/learn/paths">{c.chooseLanguage}</Link></Button></DialogFooter></DialogContent></Dialog>
    </main>
  );
}
