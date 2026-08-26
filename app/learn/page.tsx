"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Gem,
  ListChecks,
  Lock,
  Play,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getLessonCompletionRequirement,
  getLessonRule,
  getLessonKind,
  text,
  type LearnLesson,
  type LessonLocale,
} from "@/lib/learn-lessons";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useRoadmapConfig } from "@/hooks/useRoadmapConfig";
import { useAuth } from "@/hooks/useAuth";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { refreshLearningPathCompletion } from "@/lib/learning-paths";
import { getCategoryForSection } from "@/lib/roadmap-config";

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
  slug: string;
};

type LessonProgressRow = {
  lesson_id: string;
  completed: boolean;
  last_watched_seconds: number | null;
  quiz_score: number | null;
  updated_at: string | null;
};

type SubmissionRow = {
  problem_id: string | null;
  score: number | null;
};

type ProblemCodeRow = {
  id: string;
  code: number | null;
};

const copy = {
  en: {
    foundation: "Foundation",
    specialization: "Specialization",
    supplemental: "Extra path",
    choosePath: "Choose your next language",
    comingSoon: "Content coming soon",
    startPath: "Open path",
    unitTitle: "Algorithmic thinking",
    unitText:
      "Follow the path, unlock lessons and practice directly in the MiniScript+ editor.",
    progress: "Roadmap progress",
    continue: "Continue",
    review: "Review",
    start: "Start",
    locked: "Locked",
    current: "Current lesson",
    nextRecommended: "Next recommended",
    bonus: "Bonus",
    challenge: "Challenge",
    theory: "Theory",
    video: "Video",
    assessment: "Evaluation",
    quizGate: "Answer the quiz correctly",
    practiceGate: "Practice required",
    practiced: "Practiced",
    unlockHint:
      "Complete the required path, answer the quiz correctly and solve the practice problem to unlock this.",
    contents: "Roadmap contents",
    contentsText: "Jump to a section and continue from the next available lesson.",
    stats: ["day streak", "XP earned", "lessons"],
    bullets: [
      "understand variables through execution state",
      "run code step by step and inspect the current line",
      "solve short algorithmic exercises after each concept",
    ],
  },
  ro: {
    foundation: "Fundație",
    specialization: "Specializare",
    supplemental: "Traseu extra",
    choosePath: "Alege următorul limbaj",
    comingSoon: "Conținut în curând",
    startPath: "Deschide traseul",
    unitTitle: "Gândire algoritmică",
    unitText:
      "Parcurge lecțiile, deblochează concepte și exersează direct în editorul MiniScript+.",
    progress: "Progres roadmap",
    continue: "Continuă",
    review: "Recapitulare",
    start: "Începe",
    locked: "Blocat",
    current: "Lecția curentă",
    nextRecommended: "Recomandată acum",
    bonus: "Bonus",
    challenge: "Challenge",
    theory: "Teorie",
    video: "Video",
    assessment: "Evaluare",
    quizGate: "Răspunde corect la quiz",
    practiceGate: "Necesită practică",
    practiced: "Exersată",
    unlockHint:
      "Finalizează traseul obligatoriu, răspunde corect la quiz și rezolvă problema de practică pentru a debloca lecția.",
    contents: "Cuprins roadmap",
    contentsText: "Sari la o secțiune și continuă de la următoarea lecție disponibilă.",
    stats: ["zile streak", "XP câștigat", "lecții"],
    bullets: [
      "înțelegerea variabilelor prin starea execuției",
      "rulare pas cu pas și urmărirea liniei curente",
      "exerciții algoritmice scurte după fiecare concept",
    ],
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

function mergeRemoteProgress(
  localProgress: StoredProgress,
  remoteProgress: StoredProgress
) {
  const nextProgress = { ...localProgress };

  for (const [lessonId, remoteEntry] of Object.entries(remoteProgress)) {
    const localEntry = nextProgress[lessonId];
    const localTime = localEntry?.lastWatched
      ? Date.parse(localEntry.lastWatched)
      : 0;
    const remoteTime = remoteEntry.lastWatched
      ? Date.parse(remoteEntry.lastWatched)
      : 0;

    if (!localEntry || remoteTime >= localTime) {
      nextProgress[lessonId] = remoteEntry;
    }
  }

  return nextProgress;
}

function toLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return toLocalDateKey(date);
}

function calculateLessonStreak(progress: StoredProgress) {
  const completedDays = new Set(
    Object.values(progress)
      .filter((item) => item.completed && item.lastWatched)
      .map((item) => toLocalDateKey(item.lastWatched as string))
      .filter((day): day is string => Boolean(day))
  );

  let cursor = toLocalDateKey(new Date());
  if (!cursor) return 0;

  if (!completedDays.has(cursor)) {
    const yesterday = shiftDateKey(cursor, -1);
    if (!yesterday || !completedDays.has(yesterday)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (cursor && completedDays.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

export default function LearnRoadmapPage() {
  const { locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const lessonLocale = locale as LessonLocale;
  const c = copy[lessonLocale] ?? copy.en;
  const [progress, setProgress] = useState<StoredProgress>({});
  const [solvedProblemCodes, setSolvedProblemCodes] = useState<number[]>([]);
  const roadmapData = useRoadmapConfig();
  const { enrollments } = useLearningPaths();
  const lessons = roadmapData.lessons;
  const sections = roadmapData.sections;
  const categories = roadmapData.categories;

  const { data: progressData } = useQuery({
    queryKey: [
      "roadmap",
      "progress",
      user?.id || "anonymous",
      lessons.map((lesson) => lesson.id).join(","),
    ],
    queryFn: async () => {
      const localProgress = readProgress();
      if (!user) {
        return { progress: localProgress, solvedProblemCodes: [] as number[] };
      }

      const configuredLessonSlugs = lessons.map((lesson) => lesson.id);
      if (configuredLessonSlugs.length === 0) {
        return { progress: localProgress, solvedProblemCodes: [] as number[] };
      }

      const [submissionResult, lessonResult] = await Promise.all([
        supabase
          .from("submissions")
          .select("problem_id, score")
          .eq("user_id", user.id)
          .gte("score", 100)
          .returns<SubmissionRow[]>(),
        supabase
          .from("lessons")
          .select("id, slug")
          .in("slug", configuredLessonSlugs)
          .returns<LessonRow[]>(),
      ]);
      if (submissionResult.error) throw submissionResult.error;
      if (lessonResult.error) throw lessonResult.error;
      const submissionRows = submissionResult.data;

      const solvedProblemIds = Array.from(
        new Set(
          (submissionRows ?? [])
            .map((row) => row.problem_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let solvedCodes: number[] = [];
      if (solvedProblemIds.length > 0) {
        const { data: problemRows, error: problemError } = await supabase
          .from("problems")
          .select("id, code")
          .in("id", solvedProblemIds)
          .returns<ProblemCodeRow[]>();
        if (problemError) throw problemError;
        solvedCodes = (problemRows ?? [])
          .map((row) => row.code)
          .filter((code): code is number => typeof code === "number");
      }

      const lessonRows = lessonResult.data;
      if (!lessonRows?.length) {
        return { progress: localProgress, solvedProblemCodes: solvedCodes };
      }

      const slugById = new Map(lessonRows.map((lesson) => [lesson.id, lesson.slug]));

      const { data: rows, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, last_watched_seconds, quiz_score, updated_at")
        .eq("user_id", user.id)
        .in(
          "lesson_id",
          lessonRows.map((lesson) => lesson.id)
        )
        .returns<LessonProgressRow[]>();
      if (progressError) throw progressError;

      if (!rows?.length) {
        return { progress: localProgress, solvedProblemCodes: solvedCodes };
      }

      const remoteProgress = rows.reduce<StoredProgress>((acc, row) => {
        const slug = slugById.get(row.lesson_id);
        if (!slug) return acc;

        acc[slug] = {
          completed: row.completed,
          lastWatched: row.updated_at ?? undefined,
          quizScore: row.quiz_score ?? undefined,
        };

        return acc;
      }, {});

      const syncedProgress = mergeRemoteProgress(localProgress, remoteProgress);
      return { progress: syncedProgress, solvedProblemCodes: solvedCodes };
    },
    enabled: !authLoading,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!progressData) return;
    setProgress(progressData.progress);
    setSolvedProblemCodes(progressData.solvedProblemCodes);
    writeProgress(progressData.progress);
  }, [progressData]);

  useEffect(() => {
    const syncProgress = () => setProgress(readProgress());
    const syncVisibleProgress = () => {
      if (document.visibilityState === "visible") {
        syncProgress();
      }
    };

    window.addEventListener("scripticx:lesson-progress", syncProgress);
    window.addEventListener("focus", syncProgress);
    window.addEventListener("pageshow", syncProgress);
    document.addEventListener("visibilitychange", syncVisibleProgress);

    return () => {
      window.removeEventListener("scripticx:lesson-progress", syncProgress);
      window.removeEventListener("focus", syncProgress);
      window.removeEventListener("pageshow", syncProgress);
      document.removeEventListener("visibilitychange", syncVisibleProgress);
    };
  }, []);

  const solvedProblemCodeSet = useMemo(
    () => new Set(solvedProblemCodes),
    [solvedProblemCodes]
  );
  const configuredLessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons]
  );
  const categoryIdBySectionId = useMemo(
    () =>
      new Map(
        sections.map((section) => [
          section.id,
          getCategoryForSection(categories, section.id)?.id,
        ])
      ),
    [categories, sections]
  );
  const configuredLessonIdsByCategory = useMemo(
    () =>
      sections.reduce((map, section) => {
        const categoryId = categoryIdBySectionId.get(section.id);
        if (!categoryId) return map;
        const lessonIds = map.get(categoryId) ?? [];

        lessonIds.push(...section.lessonIds);
        map.set(categoryId, lessonIds);

        return map;
      }, new Map<string, string[]>()),
    [categoryIdBySectionId, sections]
  );
  const configuredCategoryIdByLessonId = useMemo(() => {
    const map = new Map<string, string>();

    sections.forEach((section) => {
      const categoryId = categoryIdBySectionId.get(section.id);
      if (!categoryId) return;
      section.lessonIds.forEach((lessonId) => map.set(lessonId, categoryId));
    });

    return map;
  }, [categoryIdBySectionId, sections]);
  const getConfiguredLessonCategoryIds = (lesson: LearnLesson) =>
    configuredLessonIdsByCategory.get(
      configuredCategoryIdByLessonId.get(lesson.id) ??
        categories[0]?.id ??
        ""
    ) ?? lessons.map((item) => item.id);
  const getConfiguredLessonCategoryIndex = (lesson: LearnLesson) => {
    const index = getConfiguredLessonCategoryIds(lesson).indexOf(lesson.id);

    return index < 0 ? 0 : index;
  };
  const hasPassingQuiz = (lesson: LearnLesson) => {
    const rule = getLessonRule(lesson);
    if (!rule.requiresCorrectQuiz || lesson.quiz.length === 0) return true;

    const score = progress[lesson.id]?.quizScore;
    return typeof score === "number" && score >= lesson.quiz.length;
  };
  const hasRequiredPractice = (lesson: LearnLesson) => {
    const requiredProblemCodes = getLessonRule(lesson).requiredProblemCodes;

    return (
      requiredProblemCodes.length === 0 ||
      requiredProblemCodes.every((code) => solvedProblemCodeSet.has(code))
    );
  };
  const isLessonCleared = (lesson: LearnLesson) =>
    Boolean(progress[lesson.id]?.completed) &&
    hasPassingQuiz(lesson) &&
    hasRequiredPractice(lesson);

  const getRequiredLessonIdsBefore = (lesson: LearnLesson) => {
    const categoryId =
      configuredCategoryIdByLessonId.get(lesson.id) ??
      categories[0]?.id ??
      "";
    const requiredLessonIds: string[] = [];

    for (const section of sections) {
      if (categoryIdBySectionId.get(section.id) !== categoryId) continue;

      for (const lessonId of section.lessonIds) {
        if (lessonId === lesson.id) return requiredLessonIds;

        const previousLesson = configuredLessonById.get(lessonId);
        if (!previousLesson) continue;

        const completionRequirement =
          getLessonCompletionRequirement(previousLesson);
        if (
          completionRequirement === "bonus" ||
          completionRequirement === "optional"
        ) {
          continue;
        }

        requiredLessonIds.push(lessonId);
      }
    }

    return requiredLessonIds;
  };

  const canOpenLesson = (lesson: LearnLesson) => {
    if (progress[lesson.id]?.completed) return true;

    const lessonIndex = getConfiguredLessonCategoryIndex(lesson);
    if (lessonIndex <= 0) return true;

    return getRequiredLessonIdsBefore(lesson).every((previousLessonId) => {
      const previousLesson = configuredLessonById.get(previousLessonId);

      return previousLesson ? isLessonCleared(previousLesson) : true;
    });
  };
  const getCurrentLessonForCategory = (categoryId: string) => {
    const categoryLessons = (configuredLessonIdsByCategory.get(categoryId) ?? [])
      .map((lessonId) => configuredLessonById.get(lessonId))
      .filter((lesson): lesson is LearnLesson => Boolean(lesson));

    return (
      categoryLessons.find(
        (lesson) =>
          canOpenLesson(lesson) &&
          !isLessonCleared(lesson) &&
          getLessonRule(lesson).kind !== "bonus"
      ) ??
      categoryLessons.find(
        (lesson) => canOpenLesson(lesson) && !progress[lesson.id]?.completed
      ) ??
      categoryLessons[categoryLessons.length - 1]
    );
  };
  const foundationCategory =
    categories.find((category) => category.kind === "foundation") ??
    categories.find((category) => category.sectionIds.length > 0) ??
    categories[0];
  const foundationLessonIds = new Set(
    foundationCategory
      ? configuredLessonIdsByCategory.get(foundationCategory.id) ?? []
      : []
  );
  const foundationLessons = lessons.filter((lesson) =>
    foundationLessonIds.has(lesson.id)
  );
  const progressLessons = foundationLessons.length ? foundationLessons : lessons;
  const requiredFoundationLessons = foundationLessons.filter((lesson) => {
    const requirement = getLessonCompletionRequirement(lesson);
    return requirement === "required" || requirement === "capstone";
  });
  const completedCount = progressLessons.filter(
    (lesson) => progress[lesson.id]?.completed
  ).length;
  const clearedCount = progressLessons.filter((lesson) =>
    isLessonCleared(lesson)
  ).length;
  const currentLesson =
    (foundationCategory
      ? getCurrentLessonForCategory(foundationCategory.id)
      : undefined) ??
    categories
      .map((category) => getCurrentLessonForCategory(category.id))
      .find(Boolean) ??
    lessons[lessons.length - 1];
  const percent = progressLessons.length
    ? Math.round((clearedCount / progressLessons.length) * 100)
    : 0;
  const xp = completedCount * 80 + progressLessons.length * 5;
  const lessonStreak = useMemo(() => calculateLessonStreak(progress), [progress]);
  const enrollmentByPathId = new Map(
    enrollments.map((enrollment) => [enrollment.pathId, enrollment])
  );
  const foundationCompleted = Boolean(
    (foundationCategory?.databaseId &&
      enrollmentByPathId.get(foundationCategory.databaseId)?.completedAt) ||
      (requiredFoundationLessons.length > 0 &&
        requiredFoundationLessons.every((lesson) => isLessonCleared(lesson)))
  );
  const contentGroups = categories
    .filter(
      (category) =>
        category.availability !== "draft" && category.availability !== "archived"
        &&
        (category.kind !== "specialization" ||
          Boolean(
            category.databaseId &&
              enrollmentByPathId.get(category.databaseId)?.isPrimary
          ))
    )
    .map((category) => ({
      category,
      id: category.id,
      label:
        category.kind === "foundation"
          ? c.foundation
          : category.kind === "specialization"
            ? c.specialization
            : c.supplemental,
      title: text(category.title, lessonLocale),
      description: text(category.description, lessonLocale),
      sections: category.sectionIds
        .map((sectionId) => sections.find((section) => section.id === sectionId))
        .filter((section): section is (typeof sections)[number] => Boolean(section)),
    }));

  useEffect(() => {
    if (!user || !progressData || !foundationCategory?.databaseId) return;

    void refreshLearningPathCompletion({
      pathId: foundationCategory.databaseId,
    }).catch((error) =>
      console.error("Could not refresh foundation completion:", error)
    );
  }, [foundationCategory?.databaseId, progressData, user]);

  return (
    <div className="scroll-smooth">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div
            id={foundationCategory?.id ?? "learning-foundation"}
            data-tour="roadmap-workspace"
            className="sx-surface sx-elevated scroll-mt-24 p-6 md:p-8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="sx-section-label">
                  {c.foundation}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
                  {foundationCategory
                    ? text(foundationCategory.title, lessonLocale)
                    : c.unitTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  {foundationCategory
                    ? text(foundationCategory.description, lessonLocale)
                    : c.unitText}
                </p>
              </div>

              {currentLesson && (
                <Button
                  asChild
                  size="lg"
                  className="w-fit"
                >
                  <Link href={`/learn/lesson/${currentLesson.id}`}>
                    {completedCount === 0 ? c.start : c.continue}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {contentGroups.map((group, groupIndex) => (
              <div key={group.id} className="space-y-6">
                {groupIndex > 0 && (
                  <div
                    id={group.id}
                    className="sx-surface sx-elevated scroll-mt-24 p-6 md:p-8"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="sx-section-label">
                          {group.label}
                        </p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
                          {group.title}
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                          {group.description}
                        </p>
                      </div>

                      {group.sections.some((section) => section.lessonIds.length > 0) && (
                        <Button
                          asChild
                          size="lg"
                          className="w-fit"
                        >
                          <Link
                            href={`/learn/lesson/${
                              group.sections
                                .flatMap((section) => section.lessonIds)
                                .find((lessonId) => configuredLessonById.has(lessonId)) ??
                              currentLesson?.id ?? ""
                            }`}
                          >
                            {c.startPath}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {group.sections.length === 0 && (
                  <Card className="scroll-mt-24 gap-0 rounded-[var(--sx-radius-panel)] border-dashed border-border py-0">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{group.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.category.availability === "coming_soon"
                            ? c.comingSoon
                            : group.description}
                        </p>
                      </div>
                      {group.category.kind === "specialization" && (
                        <Button asChild variant="outline" className="rounded-full">
                          <Link href="/learn/paths">{c.choosePath}</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {group.sections.map((section) => {
                  const sectionLessons = section.lessonIds
                    .map((id) => configuredLessonById.get(id))
                    .filter((lesson): lesson is LearnLesson => Boolean(lesson));

                  return (
                  <Card
                    id={section.id}
                    key={section.id}
                    className="scroll-mt-24 gap-0 overflow-hidden rounded-[var(--sx-radius-panel)] border-border py-0"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-border bg-muted/35 px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {text(section.label, lessonLocale)}
                          </p>
                          <h2 className="mt-1 text-lg font-semibold">
                            {text(section.title, lessonLocale)}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {text(section.description, lessonLocale)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                          {
                            sectionLessons.filter(
                              (lesson) => isLessonCleared(lesson)
                            ).length
                          }
                          /{sectionLessons.length}
                        </Badge>
                      </div>

                      <div className="relative px-4 py-8 md:px-8">
                        <div className="absolute left-1/2 top-10 hidden h-[calc(100%-80px)] w-1 -translate-x-1/2 rounded-full bg-muted md:block" />

                        <div className="space-y-6">
                          {sectionLessons.map((lesson) => {
                            const index = getConfiguredLessonCategoryIndex(lesson);
                            const rule = getLessonRule(lesson);
                            const lessonKind = getLessonKind(lesson);
                            const done = Boolean(progress[lesson.id]?.completed);
                            const quizPassed = hasPassingQuiz(lesson);
                            const practiced = hasRequiredPractice(lesson);
                            const cleared = isLessonCleared(lesson);
                            const isCurrent = lesson.id === currentLesson.id;
                            const locked = !canOpenLesson(lesson);
                            const isBonus = rule.kind === "bonus";
                            const isTheory = lessonKind === "theory";
                            const isVideo = lessonKind === "video";
                            const isAssessment = lessonKind === "assessment";
                            const isChallenge =
                              lessonKind === "challenge" ||
                              (!isAssessment && !isTheory && rule.kind === "challenge");
                            const alignment = index % 2 === 0 ? "md:mr-auto" : "md:ml-auto";

                            return (
                              <Link
                                key={lesson.id}
                                href={locked ? "#" : `/learn/lesson/${lesson.id}`}
                                aria-disabled={locked}
                                className={cn(
                                  "group relative block md:w-[48%]",
                                  alignment,
                                  locked && "pointer-events-none opacity-60"
                                )}
                              >
                                <div
                                  className={cn(
                                    "rounded-[var(--sx-radius-card)] border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                                    cleared && "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30",
                                    isCurrent &&
                                      !cleared &&
                                      "border-lime-300 ring-4 ring-lime-100 dark:border-lime-700 dark:ring-lime-900/50",
                                    isBonus &&
                                      !cleared &&
                                      !isCurrent &&
                                      "border-sky-100 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/25",
                                    isTheory &&
                                      !cleared &&
                                      !isCurrent &&
                                      "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/25",
                                    isVideo &&
                                      !cleared &&
                                      !isCurrent &&
                                      "border-blue-100 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/25",
                                    isChallenge &&
                                      !cleared &&
                                      !isCurrent &&
                                      "border-amber-100 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/25",
                                    isAssessment &&
                                      !cleared &&
                                      !isCurrent &&
                                      "border-violet-100 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/25",
                                    locked && "bg-muted/50"
                                  )}
                                >
                                  <div className="flex items-start gap-4">
                                    <div
                                      className={cn(
                                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
                                        cleared
                                          ? "bg-emerald-500"
                                          : isCurrent
                                            ? "bg-lime-500"
                                            : isAssessment
                                              ? "bg-violet-500"
                                            : isChallenge
                                              ? "bg-amber-400"
                                              : isTheory
                                                ? "bg-emerald-500"
                                                : isVideo
                                                  ? "bg-blue-500"
                                              : isBonus
                                                ? "bg-sky-400"
                                                : "bg-muted-foreground/40"
                                      )}
                                    >
                                      {cleared ? (
                                        <Check className="h-5 w-5" />
                                      ) : locked ? (
                                        <Lock className="h-5 w-5" />
                                      ) : isAssessment ? (
                                        <ListChecks className="h-5 w-5" />
                                      ) : isChallenge ? (
                                        <Trophy className="h-5 w-5" />
                                      ) : isTheory ? (
                                        <BookOpen className="h-5 w-5" />
                                      ) : isVideo ? (
                                        <Video className="h-5 w-5" />
                                      ) : isBonus ? (
                                        <Sparkles className="h-5 w-5" />
                                      ) : (
                                        <Play className="h-5 w-5 fill-current" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold leading-tight">
                                          {lesson.order}.{" "}
                                          {text(lesson.title, lessonLocale)}
                                        </h2>
                                        {isCurrent && !cleared && !locked && (
                                          <Badge className="rounded-full bg-foreground text-background hover:bg-foreground">
                                            {c.nextRecommended}
                                          </Badge>
                                        )}
                                        {isBonus && (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                                          >
                                            <Sparkles className="mr-1 h-3 w-3" />
                                            {c.bonus}
                                          </Badge>
                                        )}
                                        {isChallenge && (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                          >
                                            <Trophy className="mr-1 h-3 w-3" />
                                            {c.challenge}
                                          </Badge>
                                        )}
                                        {isTheory && (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                          >
                                            <BookOpen className="mr-1 h-3 w-3" />
                                            {c.theory}
                                          </Badge>
                                        )}
                                        {isVideo && (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                          >
                                            <Video className="mr-1 h-3 w-3" />
                                            {c.video}
                                          </Badge>
                                        )}
                                        {isAssessment && (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                                          >
                                            <ListChecks className="mr-1 h-3 w-3" />
                                            {c.assessment}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {text(lesson.summary, lessonLocale)}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline" className="rounded-full">
                                          <BookOpen className="mr-1 h-3 w-3" />
                                          {lesson.minutes} min
                                        </Badge>
                                        {lesson.tags.slice(0, 2).map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="rounded-full"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                      {!locked && !cleared && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {done && !quizPassed && (
                                            <Badge
                                              variant="outline"
                                              className="rounded-full border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                            >
                                              {c.quizGate}
                                            </Badge>
                                          )}
                                          {rule.requiredProblemCodes.length > 0 && (
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "rounded-full",
                                                practiced
                                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                  : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                                              )}
                                            >
                                              {practiced ? c.practiced : c.practiceGate}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                      {locked && (
                                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                          {c.unlockHint}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="-m-1 space-y-4 p-1 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Card className="sx-surface gap-0 rounded-[var(--sx-radius-panel)] py-0 ring-0">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.progress}</p>
                    <p className="text-4xl font-bold">{percent}%</p>
                  </div>
                  <Trophy className="h-9 w-9 text-[var(--sx-success)]" />
                </div>
                <Progress
                  value={percent}
                  className="h-2 [&_[data-slot=progress-indicator]]:bg-[var(--sx-success)]"
                />
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <div className="rounded-[var(--sx-radius-card)] bg-muted/60 p-3">
                    <Flame className="mx-auto mb-1 h-4 w-4 text-[var(--sx-warning)]" />
                    <strong className="block text-base text-foreground">{lessonStreak}</strong>
                    {c.stats[0]}
                  </div>
                  <div className="rounded-[var(--sx-radius-card)] bg-muted/60 p-3">
                    <Gem className="mx-auto mb-1 h-4 w-4 text-[var(--sx-info)]" />
                    <strong className="block text-base text-foreground">{xp}</strong>
                    {c.stats[1]}
                  </div>
                  <div className="rounded-[var(--sx-radius-card)] bg-muted/60 p-3">
                    <Sparkles className="mx-auto mb-1 h-4 w-4 text-[var(--sx-success)]" />
                    <strong className="block text-base text-foreground">{progressLessons.length}</strong>
                    {c.stats[2]}
                  </div>
                </div>
              </CardContent>
            </Card>

            {foundationCompleted && (
              <Card className="gap-0 overflow-hidden rounded-[var(--sx-radius-panel)] border-emerald-200 bg-emerald-50/70 py-0 dark:border-emerald-900 dark:bg-emerald-950/25">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                      <Check className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{c.choosePath}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {foundationCategory
                          ? text(foundationCategory.title, lessonLocale)
                          : "MiniScript+"}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="mt-4 w-full rounded-full">
                    <Link href="/learn/paths">
                      {c.choosePath}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="sx-surface gap-0 rounded-[var(--sx-radius-panel)] py-0 ring-0">
              <CardContent className="p-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {c.contents}
                  </h2>
                  <p className="mt-2 text-base leading-6 text-muted-foreground">
                    {c.contentsText}
                  </p>
                </div>

                <nav className="mt-6 space-y-3">
                  {contentGroups.map((group) => {
                    const groupLessons = group.sections.flatMap((section) =>
                      section.lessonIds
                        .map((id) => configuredLessonById.get(id))
                        .filter((lesson): lesson is LearnLesson =>
                          Boolean(lesson)
                        )
                    );
                    const completedInGroup = groupLessons.filter(
                      (lesson) => progress[lesson.id]?.completed
                    ).length;

                    return (
                      <div
                        key={group.id}
                        className="rounded-[var(--sx-radius-panel)] border border-border bg-muted/40 p-2"
                      >
                        <a
                          href={`#${group.id}`}
                          className="group flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition hover:bg-accent"
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-medium text-primary">
                              {group.label}
                            </span>
                            <span className="mt-0.5 block truncate font-semibold">
                              {group.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {completedInGroup}/{groupLessons.length} {c.stats[2]}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" />
                        </a>

                        <div className="mt-1 space-y-1">
                          {group.sections.map((section) => {
                            const sectionLessons = section.lessonIds
                              .map((id) =>
                                configuredLessonById.get(id)
                              )
                              .filter(
                                (lesson): lesson is LearnLesson =>
                                  Boolean(lesson)
                              );
                            const completedInSection = sectionLessons.filter(
                              (lesson) => progress[lesson.id]?.completed
                            ).length;
                            const isCurrentSection = section.lessonIds.includes(
                              currentLesson.id
                            );

                            return (
                              <a
                                key={section.id}
                                href={`#${section.id}`}
                                className={cn(
                                  "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30",
                                  isCurrentSection
                                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                                    : "border-transparent bg-background"
                                )}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">
                                    {text(section.title, lessonLocale)}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {completedInSection}/{sectionLessons.length}{" "}
                                    {c.stats[2]}
                                  </span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
