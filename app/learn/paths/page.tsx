"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Code2,
  Lock,
  Route,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useRoadmapConfig } from "@/hooks/useRoadmapConfig";
import {
  refreshLearningPathCompletion,
  selectLearningPath,
} from "@/lib/learning-paths";
import { text, type LessonLocale } from "@/lib/learn-lessons";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    back: "Back to roadmap",
    badge: "Your next chapter",
    title: "Choose your programming language",
    description:
      "Your MiniScript+ foundation stays with you. Pick one primary path now and switch later without losing progress.",
    available: "Available",
    comingSoon: "Content coming soon",
    selected: "Current choice",
    start: "Start this path",
    choose: "Choose path",
    switch: "Switch to this path",
    prerequisite: "Complete {path} to unlock this choice.",
    hours: "estimated hours",
    saved: "Your learning path has been updated.",
    saveError: "Could not update your learning path.",
    preparing: "Preparing path configuration…",
    foundationComplete: "Foundation completed",
    foundationRequired: "Foundation required",
  },
  ro: {
    back: "Înapoi la roadmap",
    badge: "Următorul tău capitol",
    title: "Alege limbajul de programare",
    description:
      "Fundația MiniScript+ rămâne cu tine. Alege acum un traseu principal și îl poți schimba mai târziu fără să pierzi progresul.",
    available: "Disponibil",
    comingSoon: "Conținut în curând",
    selected: "Alegerea curentă",
    start: "Începe acest traseu",
    choose: "Alege traseul",
    switch: "Schimbă pe acest traseu",
    prerequisite: "Finalizează {path} pentru a debloca această alegere.",
    hours: "ore estimate",
    saved: "Traseul tău de învățare a fost actualizat.",
    saveError: "Nu am putut actualiza traseul de învățare.",
    preparing: "Pregătim configurația traseului…",
    foundationComplete: "Fundație finalizată",
    foundationRequired: "Necesită fundația",
  },
} as const;

export default function LearningPathSelectionPage() {
  const { locale } = useLanguage();
  const lessonLocale = (locale === "ro" ? "ro" : "en") as LessonLocale;
  const c = copy[lessonLocale];
  const roadmap = useRoadmapConfig();
  const { enrollments, user } = useLearningPaths();
  const [savingPathId, setSavingPathId] = useState<string | null>(null);

  const enrollmentByPathId = useMemo(
    () => new Map(enrollments.map((enrollment) => [enrollment.pathId, enrollment])),
    [enrollments]
  );
  const categoryById = useMemo(
    () => new Map(roadmap.categories.map((category) => [category.id, category])),
    [roadmap.categories]
  );
  const specializationPaths = roadmap.categories
    .filter(
      (category) =>
        category.kind === "specialization" &&
        category.availability !== "draft" &&
        category.availability !== "archived"
    )
    .sort((left, right) => left.order - right.order);
  const foundation = roadmap.categories.find(
    (category) => category.kind === "foundation"
  );
  const foundationEnrollment = foundation?.databaseId
    ? enrollmentByPathId.get(foundation.databaseId)
    : undefined;
  const foundationCompleted = Boolean(foundationEnrollment?.completedAt);

  useEffect(() => {
    if (!user?.id || !foundation?.databaseId) return;

    void refreshLearningPathCompletion({
      pathId: foundation.databaseId,
    }).catch((error) =>
      console.error("Could not refresh foundation completion:", error)
    );
  }, [foundation?.databaseId, user?.id]);

  async function choosePath(pathId: string) {
    setSavingPathId(pathId);
    try {
      await selectLearningPath(pathId);
      toast.success(c.saved);
    } catch (error) {
      toast.error(c.saveError, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingPathId(null);
    }
  }

  return (
    <main className="min-h-full">
      <div className="mx-auto max-w-6xl space-y-8">
        <Button asChild variant="ghost" className="w-fit rounded-full">
          <Link href="/learn">
            <ArrowLeft className="mr-2 size-4" />
            {c.back}
          </Link>
        </Button>

        <section className="relative overflow-hidden rounded-[var(--sx-radius-panel)] border border-foreground/10 bg-foreground px-6 py-10 text-background shadow-sm md:px-10 md:py-14">
          <div className="absolute inset-0 bg-foreground/5" />
          <div className="relative max-w-3xl">
            <Badge className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/10">
              <Sparkles className="mr-1 size-3.5" />
              {c.badge}
            </Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              {c.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
              {c.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-white/15 px-3 py-1.5 text-white",
                  foundationCompleted && "border-emerald-400/40 bg-emerald-400/15"
                )}
              >
                {foundationCompleted ? (
                  <Check className="mr-1.5 size-3.5 text-emerald-300" />
                ) : (
                  <Lock className="mr-1.5 size-3.5 text-white/60" />
                )}
                {foundationCompleted
                  ? c.foundationComplete
                  : c.foundationRequired}
              </Badge>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {specializationPaths.map((path) => {
            const enrollment = path.databaseId
              ? enrollmentByPathId.get(path.databaseId)
              : undefined;
            const selected = Boolean(enrollment?.isPrimary);
            const needsActivation = Boolean(
              selected &&
                enrollment?.status === "selected" &&
                path.availability === "published"
            );
            const prerequisite = path.prerequisitePathId
              ? categoryById.get(path.prerequisitePathId)
              : undefined;
            const prerequisiteEnrollment = prerequisite?.databaseId
              ? enrollmentByPathId.get(prerequisite.databaseId)
              : undefined;
            const unlocked =
              !prerequisite || Boolean(prerequisiteEnrollment?.completedAt);
            const configured = Boolean(path.databaseId);
            const saving = savingPathId === path.databaseId;

            return (
              <Card
                key={path.id}
                className={cn(
                  "group relative overflow-hidden rounded-[var(--sx-radius-panel)] border-border transition duration-300 hover:-translate-y-1 hover:shadow-md",
                  selected && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                )}
              >
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: path.accentColor ?? "#10b981" }}
                />
                <CardContent className="flex min-h-[330px] flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex size-12 items-center justify-center rounded-2xl border bg-muted/60 font-mono text-sm font-bold shadow-sm"
                      style={{ color: path.accentColor ?? "currentColor" }}
                    >
                      <Code2 className="size-5" />
                    </div>
                    <Badge
                      variant={selected ? "default" : "secondary"}
                      className="rounded-full"
                    >
                      {selected
                        ? c.selected
                        : path.availability === "coming_soon"
                          ? c.comingSoon
                          : c.available}
                    </Badge>
                  </div>

                  <h2 className="mt-6 text-2xl font-bold tracking-tight">
                    {text(path.title, lessonLocale)}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {text(path.description, lessonLocale)}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {path.estimatedHours && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5">
                        <Clock3 className="size-3.5" />
                        {path.estimatedHours} {c.hours}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 uppercase">
                      <Route className="size-3.5" />
                      {path.language}
                    </span>
                  </div>

                  {!unlocked && prerequisite && (
                    <p className="mt-4 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      {c.prerequisite.replace(
                        "{path}",
                        text(prerequisite.title, lessonLocale)
                      )}
                    </p>
                  )}

                  <Button
                    className="mt-5 w-full rounded-full"
                    variant={selected ? "secondary" : "default"}
                    disabled={
                      !unlocked ||
                      !configured ||
                      (selected && !needsActivation) ||
                      saving
                    }
                    onClick={() => {
                      if (path.databaseId) void choosePath(path.databaseId);
                    }}
                  >
                    {!configured
                      ? c.preparing
                      : needsActivation
                        ? c.start
                        : selected
                        ? c.selected
                        : enrollment
                          ? c.switch
                          : c.choose}
                    {(!selected || needsActivation) && configured && unlocked && (
                      <ArrowRight className="ml-2 size-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
