"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ListChecks,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { ComplexityAnalyzerCard } from "@/components/editor/ComplexityAnalyzerCard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  analyzeMiniScriptComplexity,
  type ComplexityAnalysis,
} from "@/lib/complexity-analyzer";
import { advanceLine, parseLine, reset, setVariable, step } from "@/lib/engine";
import {
  getLessonById,
  getLessonKind,
  text,
  youtubeEmbedUrl,
  type LessonLocale,
  type LessonQuizQuestion,
} from "@/lib/learn-lessons";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useRoadmapConfig } from "@/hooks/useRoadmapConfig";
import { useAuth } from "@/hooks/useAuth";

type StoredProgress = Record<
  string,
  {
    completed?: boolean;
    lastWatched?: string;
    quizScore?: number;
  }
>;

const progressKey = "scripticx.lessonProgress.v1";

type LessonRow = {
  id: string;
};

type LessonProgressRow = {
  completed: boolean;
  last_watched_seconds: number | null;
  quiz_score: number | null;
  updated_at: string | null;
};

type DisplayQuizQuestion = LessonQuizQuestion & {
  originalIndex: number;
};

const copy = {
  en: {
    back: "Back to roadmap",
    completed: "Completed",
    explanation: "Core idea",
    mark: "Mark as completed",
    minutes: "min",
    noOutput: "Program finished without output.",
    notFound: "Lesson not found",
    notFoundBody: "This lesson is not available yet.",
    next: "Next lesson",
    output: "Output",
    playground: "Interactive MSP playground",
    previous: "Previous lesson",
    quiz: "Quick quiz",
    recommended: "Recommended problems",
    reset: "Reset",
    run: "Run code",
    running: "Running...",
    sampleInput: "Sample input",
    saved: "Progress syncs to your account when you are signed in.",
    submitQuiz: "Check answer",
    tags: "Tags",
    videoLabel: "Video lesson",
    videoPlaceholder: "YouTube video placeholder",
    videoSoon: "The lesson video will appear here after it is published.",
    lessonTypes: {
      theory: "Theory lesson",
      video: "Video lesson",
      challenge: "Code challenge",
      assessment: "Evaluation quiz",
      interactive: "Interactive lesson",
    },
  },
  ro: {
    back: "Înapoi la roadmap",
    completed: "Finalizată",
    explanation: "Ideea de bază",
    mark: "Marchează ca finalizată",
    minutes: "min",
    noOutput: "Programul s-a terminat fără output.",
    notFound: "Lecția nu există",
    notFoundBody: "Această lecție nu este disponibilă încă.",
    next: "Lecția următoare",
    output: "Output",
    playground: "Editor interactiv MSP",
    previous: "Lecția anterioară",
    quiz: "Quiz rapid",
    recommended: "Probleme recomandate",
    reset: "Resetează",
    run: "Rulează codul",
    running: "Rulează...",
    sampleInput: "Input de test",
    saved: "Progresul se sincronizează cu contul tău când ești autentificat.",
    submitQuiz: "Verifică răspunsul",
    tags: "Tag-uri",
    videoLabel: "Lecție video",
    videoPlaceholder: "Template video YouTube",
    videoSoon: "Videoul lecției va apărea aici după publicare.",
    lessonTypes: {
      theory: "Lecție de teorie",
      video: "Lecție video",
      challenge: "Code challenge",
      assessment: "Quiz de evaluare",
      interactive: "Lecție interactivă",
    },
  },
};

function readProgress(): StoredProgress {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(progressKey) || "{}") as StoredProgress;
  } catch {
    return {};
  }
}

function writeProgress(progress: StoredProgress) {
  if (typeof window === "undefined") return;

  localStorage.setItem(progressKey, JSON.stringify(progress));
  window.dispatchEvent(
    new CustomEvent("scripticx:lesson-progress", { detail: progress })
  );
}

function parseInput(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    });
}

function useLessonId() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params.id;
  return Array.isArray(rawId) ? rawId[0] : rawId;
}

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function randomizeQuiz(quiz: LessonQuizQuestion[]): DisplayQuizQuestion[] {
  return shuffleArray(
    quiz.map((question, originalIndex) => {
      const optionEntries = shuffleArray(
        question.options.map((option, optionIndex) => ({
          option,
          optionIndex,
        }))
      );

      return {
        ...question,
        originalIndex,
        options: optionEntries.map((entry) => entry.option),
        answerIndex: optionEntries.findIndex(
          (entry) => entry.optionIndex === question.answerIndex
        ),
      };
    })
  );
}

async function persistLessonProgress(
  userIdValue: string,
  lessonDbIdValue: string,
  lessonProgress: StoredProgress[string]
) {
  const timestamp = lessonProgress.lastWatched ?? new Date().toISOString();

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: userIdValue,
      lesson_id: lessonDbIdValue,
      completed: Boolean(lessonProgress.completed),
      completed_at: lessonProgress.completed ? timestamp : null,
      last_watched_seconds: 0,
      quiz_score: lessonProgress.quizScore ?? null,
      updated_at: timestamp,
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) {
    console.error("Could not sync lesson progress:", error);
  }
}

export default function LessonPage() {
  const { locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const lessonLocale = locale as LessonLocale;
  const c = copy[lessonLocale] ?? copy.en;
  const lessonId = useLessonId();
  const roadmapData = useRoadmapConfig();
  const lessons = roadmapData.lessons;
  const sections = roadmapData.sections;
  const lesson = useMemo(
    () => lessons.find((item) => item.id === lessonId) ?? getLessonById(lessonId),
    [lessonId, lessons]
  );
  const categoryLessonIds = useMemo(() => {
    if (!lesson) return [];

    const section = sections.find((item) => item.lessonIds.includes(lesson.id));
    const categoryId = section?.id.startsWith("complexity-")
      ? "complexity-analysis"
      : "miniscript-roadmap";

    return sections
      .filter(
        (item) =>
          (item.id.startsWith("complexity-")
            ? "complexity-analysis"
            : "miniscript-roadmap") === categoryId
      )
      .flatMap((item) => item.lessonIds);
  }, [lesson, sections]);
  const lessonIndex = lesson
    ? categoryLessonIds.indexOf(lesson.id)
    : -1;
  const previousLesson =
    lessonIndex > 0
      ? lessons.find((item) => item.id === categoryLessonIds[lessonIndex - 1]) ??
        getLessonById(categoryLessonIds[lessonIndex - 1]) ??
        null
      : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < categoryLessonIds.length - 1
      ? lessons.find((item) => item.id === categoryLessonIds[lessonIndex + 1]) ??
        getLessonById(categoryLessonIds[lessonIndex + 1]) ??
        null
      : null;

  const [progress, setProgress] = useState<StoredProgress>({});
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizQuestions, setQuizQuestions] = useState<DisplayQuizQuestion[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const userId = user?.id || null;

  useEffect(() => {
    setProgress(readProgress());
  }, []);

  const { data: remoteLessonProgress } = useQuery({
    queryKey: ["roadmap", "lesson-progress", lesson?.id, userId],
    queryFn: async () => {
      if (!lesson || !userId) return null;
      const { data: lessonRow, error: lessonError } = await supabase
        .from("lessons")
        .select("id")
        .eq("slug", lesson.id)
        .maybeSingle()
        .returns<LessonRow | null>();
      if (lessonError) throw lessonError;
      if (!lessonRow) return null;

      const { data: row, error: progressError } = await supabase
        .from("lesson_progress")
        .select("completed, last_watched_seconds, quiz_score, updated_at")
        .eq("user_id", userId)
        .eq("lesson_id", lessonRow.id)
        .maybeSingle()
        .returns<LessonProgressRow | null>();
      if (progressError) throw progressError;
      return { lessonDbId: lessonRow.id, row };
    },
    enabled: Boolean(lesson && userId) && !authLoading,
    staleTime: 2 * 60 * 1000,
  });
  const lessonDbId = remoteLessonProgress?.lessonDbId || null;

  useEffect(() => {
      const row = remoteLessonProgress?.row;
      if (!row || !lesson) return;
      setProgress((current) => {
        const nextProgress = {
          ...current,
          [lesson.id]: {
            completed: row.completed,
            lastWatched: row.updated_at ?? undefined,
            quizScore: row.quiz_score ?? undefined,
          },
        };

        writeProgress(nextProgress);

        return nextProgress;
      });
  }, [lesson, remoteLessonProgress]);

  useEffect(() => {
    if (!lesson) return;

    setCode(lesson.code);
    setInput(lesson.sampleInput);
    setOutput("");
    setQuizAnswers({});
    setQuizQuestions(randomizeQuiz(lesson.quiz));
    setQuizSubmitted(false);
  }, [lesson]);

  const embedUrl = youtubeEmbedUrl(lesson?.videoUrl);
  const completed = lesson ? Boolean(progress[lesson.id]?.completed) : false;
  const quizScore = quizQuestions.reduce((score, question, index) => {
    return quizAnswers[index] === question.answerIndex ? score + 1 : score;
  }, 0);
  const showComplexityAnalyzer = Boolean(
    lesson?.tags.includes("complexity") ||
      lesson?.unit.en === "Complexity Analysis"
  );
  const complexityAnalysis = useMemo<ComplexityAnalysis | null>(() => {
    if (!lesson || !showComplexityAnalyzer) return null;
    return analyzeMiniScriptComplexity(code, lessonLocale);
  }, [code, lesson, lessonLocale, showComplexityAnalyzer]);

  useEffect(() => {
    if (!lesson || !userId || !lessonDbId) return;

    const lessonProgress = progress[lesson.id];
    if (!lessonProgress?.lastWatched) return;

    void persistLessonProgress(userId, lessonDbId, lessonProgress);
  }, [lesson, lessonDbId, progress, userId]);

  function saveProgress(update: StoredProgress[string]) {
    if (!lesson) return;

    const nextProgress = {
      ...progress,
      [lesson.id]: {
        ...progress[lesson.id],
        ...update,
        lastWatched: new Date().toISOString(),
      },
    };

    setProgress(nextProgress);
    writeProgress(nextProgress);

    if (userId && lessonDbId) {
      void persistLessonProgress(userId, lessonDbId, nextProgress[lesson.id]);
    }
  }

  function runCode() {
    setIsRunning(true);

    try {
      reset();

      const program = code.split("\n").map((line) => parseLine(line));
      const inputs = parseInput(input);
      let inputIndex = 0;
      const outputLines: string[] = [];

      for (let guard = 0; guard < 1000; guard++) {
        const result = step(program);

        if (!result) break;

        if (result.inputRequest) {
          if (inputIndex >= inputs.length) {
            throw new Error(`Missing input for ${result.inputRequest}`);
          }

          setVariable(result.inputRequest, inputs[inputIndex]);
          inputIndex += 1;
          advanceLine();
          continue;
        }

        if (result.output !== null && result.output !== undefined) {
          outputLines.push(String(result.output));
        }
      }

      setOutput(outputLines.length ? outputLines.join("\n") : c.noOutput);
      saveProgress({ lastWatched: new Date().toISOString() });
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setIsRunning(false);
    }
  }

  function submitQuiz() {
    setQuizSubmitted(true);
    saveProgress({ quizScore });
  }

  function markCompleted() {
    saveProgress({
      completed: true,
      quizScore: quizQuestions.length ? quizScore : undefined,
    });
  }

  if (!lesson) {
    return (
      <main className="flex min-h-full items-center justify-center bg-white p-6">
        <Card className="max-w-md rounded-[24px] border-zinc-200 text-center">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{c.notFound}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {c.notFoundBody}
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/learn">{c.back}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const lessonKind = getLessonKind(lesson);
  const isTheoryLesson = lessonKind === "theory";
  const isVideoLesson = lessonKind === "video";
  const isAssessmentLesson = lessonKind === "assessment";
  const hasPlayground =
    lessonKind === "challenge" || lessonKind === "interactive";
  const showQuiz = !isTheoryLesson && quizQuestions.length > 0;
  const showRecommendedProblems =
    !isTheoryLesson &&
    !isAssessmentLesson &&
    lesson.recommendedProblems.length > 0;
  const theoryBlocks =
    lesson.theory && lesson.theory.length > 0
      ? lesson.theory
      : [
          {
            heading: lesson.title,
            body: lesson.transcript,
            bullets: lesson.tags.map((tag) => ({ en: tag, ro: tag })),
          },
        ];

  return (
    <main className="min-h-full overflow-y-auto bg-white px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button asChild variant="ghost" className="w-fit rounded-full">
            <Link href="/learn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {c.back}
            </Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full">
              {lesson.unit[lessonLocale]}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {lesson.minutes} {c.minutes}
            </Badge>
            {completed && (
              <Badge className="rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {c.completed}
              </Badge>
            )}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 p-6 text-white shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase text-emerald-300">
            {lesson.order.toString().padStart(2, "0")} ·{" "}
            {c.lessonTypes[lessonKind]}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">
            {text(lesson.title, lessonLocale)}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75 md:text-base">
            {text(lesson.summary, lessonLocale)}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {lesson.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full bg-white/10 text-white hover:bg-white/15"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>

        <div
          className={cn(
            "grid gap-6",
            isAssessmentLesson
              ? "mx-auto max-w-2xl"
              : "xl:grid-cols-[minmax(0,1fr)_420px]"
          )}
        >
          {!isAssessmentLesson && (
          <section className="space-y-6">
            {isVideoLesson && (
            <Card className="overflow-hidden rounded-[24px] border-zinc-200">
              <CardContent className="p-0">
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-lg font-semibold">{c.videoLabel}</h2>
                </div>
                {embedUrl ? (
                  <iframe
                    className="aspect-video w-full"
                    src={embedUrl}
                    title={text(lesson.title, lessonLocale)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:36px_36px] p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-sm">
                      <Play className="h-6 w-6 fill-current" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">
                      {c.videoPlaceholder}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {c.videoSoon}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            <Card className="rounded-[24px] border-zinc-200">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  {c.explanation}
                </p>
                {isTheoryLesson ? (
                  <div className="space-y-3">
                    {theoryBlocks.map((block, index) => (
                      <article
                        key={`${text(block.heading, lessonLocale)}-${index}`}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
                      >
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0 space-y-2">
                            <h2 className="font-semibold">
                              {text(block.heading, lessonLocale)}
                            </h2>
                            <p className="text-base leading-7 text-zinc-700">
                              {text(block.body, lessonLocale)}
                            </p>
                            {block.bullets?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {block.bullets.map((bullet) => (
                                  <Badge
                                    key={text(bullet, lessonLocale)}
                                    variant="secondary"
                                    className="rounded-full"
                                  >
                                    {text(bullet, lessonLocale)}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-base leading-7 text-zinc-700">
                    {text(lesson.transcript, lessonLocale)}
                  </p>
                )}
              </CardContent>
            </Card>

            {hasPlayground && (
            <Card className="overflow-hidden rounded-[24px] border-zinc-200">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{c.playground}</h2>
                    <p className="text-sm text-muted-foreground">
                      MiniScript+ · {text(lesson.title, lessonLocale)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setCode(lesson.code);
                        setInput(lesson.sampleInput);
                        setOutput("");
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {c.reset}
                    </Button>
                    <Button
                      className="rounded-full bg-black text-white hover:bg-black/90"
                      disabled={isRunning}
                      onClick={runCode}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      {isRunning ? c.running : c.run}
                    </Button>
                  </div>
                </div>

                <div className="grid min-h-[480px] lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-h-[420px] border-b border-zinc-100 lg:border-b-0 lg:border-r">
                    <MiniScriptMonacoEditor
                      value={code}
                      onChange={setCode}
                      height="420px"
                      options={{
                        fontSize: 15,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                      }}
                    />
                  </div>

                  <div className="flex min-h-[420px] flex-col">
                    <div className="border-b border-zinc-100 p-4">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        {c.sampleInput}
                      </label>
                      <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        className="mt-2 h-28 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-3 font-mono text-sm outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div className="flex-1 bg-zinc-950 p-4 text-emerald-300">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-white/50">
                        <Terminal className="h-4 w-4" />
                        {c.output}
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                        {output || ">"}
                      </pre>
                    </div>
                  </div>

                  {showComplexityAnalyzer && (
                    <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 lg:col-span-2">
                      <ComplexityAnalyzerCard
                        analysis={complexityAnalysis}
                        compact
                        frame="section"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </section>
          )}

          <aside
            className={cn(
              "space-y-6",
              !isAssessmentLesson && "xl:sticky xl:top-6 xl:self-start"
            )}
          >
            {showQuiz && (
            <Card className="rounded-[24px] border-zinc-200">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-700">
                    {c.quiz}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {quizScore}/{quizQuestions.length}
                  </h2>
                </div>

                {quizQuestions.map((question, index) => (
                  <div key={text(question.question, lessonLocale)} className="space-y-2">
                    <p className="font-medium">
                      {index + 1}. {text(question.question, lessonLocale)}
                    </p>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const selected = quizAnswers[index] === optionIndex;
                        const correct =
                          quizSubmitted && optionIndex === question.answerIndex;
                        const wrong =
                          quizSubmitted && selected && optionIndex !== question.answerIndex;

                        return (
                          <button
                            key={text(option, lessonLocale)}
                            onClick={() =>
                              setQuizAnswers((current) => ({
                                ...current,
                                [index]: optionIndex,
                              }))
                            }
                            className={cn(
                              "w-full rounded-2xl border border-zinc-200 px-3 py-2 text-left text-sm transition hover:bg-zinc-50",
                              selected && "border-black bg-zinc-50",
                              correct && "border-emerald-300 bg-emerald-50",
                              wrong && "border-red-300 bg-red-50"
                            )}
                          >
                            {text(option, lessonLocale)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={submitQuiz}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  {c.submitQuiz}
                </Button>
              </CardContent>
            </Card>
            )}

            {showRecommendedProblems && (
            <Card className="rounded-[24px] border-zinc-200">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  {c.recommended}
                </p>
                {lesson.recommendedProblems.map((problem) => (
                  <Link
                    key={`${text(problem.title, lessonLocale)}-${problem.href}`}
                    href={problem.href}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 px-3 py-3 text-sm transition hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {problem.code ? `#${problem.code} ` : ""}
                        {text(problem.title, lessonLocale)}
                      </span>
                      <span className="text-xs text-zinc-500">{problem.topic}</span>
                    </span>
                    {problem.difficulty ? (
                      <Badge variant="secondary" className="rounded-full capitalize">
                        {problem.difficulty}
                      </Badge>
                    ) : null}
                  </Link>
                ))}
              </CardContent>
            </Card>
            )}

            <Card className="rounded-[24px] border-zinc-200 bg-zinc-950 text-white">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      {completed ? c.completed : c.mark}
                    </h2>
                    <p className="text-sm text-white/60">{c.saved}</p>
                  </div>
                </div>
                <Button
                  className="w-full rounded-full bg-white text-black hover:bg-white/90 dark:!bg-white dark:!text-black dark:hover:!bg-white/90"
                  onClick={markCompleted}
                  disabled={completed}
                >
                  {completed ? c.completed : c.mark}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 md:flex-row md:items-center md:justify-between">
          {previousLesson ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/learn/lesson/${previousLesson.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {c.previous}
              </Link>
            </Button>
          ) : (
            <span />
          )}

          {nextLesson ? (
            <Button asChild className="rounded-full bg-black text-white hover:bg-black/90">
              <Link href={`/learn/lesson/${nextLesson.id}`}>
                {c.next}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
