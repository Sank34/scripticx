"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Code2, ListChecks } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { useRoadmapConfig } from "@/hooks/useRoadmapConfig";
import { readResumeLesson } from "@/lib/dashboard-resume";
import { readEditorSessionDraft } from "@/lib/editor-session-draft";
import { supabase } from "@/lib/supabase";

export function DashboardResume({ userId, problem }: {
  userId: string;
  problem?: { id: string; title: string };
}) {
  const { locale, t } = useLanguage();
  const [local, setLocal] = useState<{
    lessonId: string | null;
    draft: { title: string; dirty: boolean } | null;
  }>();
  useEffect(() => {
    const draft = readEditorSessionDraft(userId);
    setLocal({
      lessonId: readResumeLesson(userId),
      draft: draft && (draft.savedId || draft.dirty) ? { title: draft.title, dirty: draft.dirty } : null,
    });
  }, [userId]);

  const roadmap = useRoadmapConfig({ enabled: Boolean(local?.lessonId) });
  const lesson = roadmap.lessons.find((item) => item.id === local?.lessonId);
  const project = useQuery({
    queryKey: ["editor-snippets", "dashboard-resume", userId],
    enabled: Boolean(local && !local.draft),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("snippets").select("id, title")
        .eq("user_id", userId).eq("is_live_workspace", false)
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .limit(1).abortSignal(signal).maybeSingle<{ id: string; title: string | null }>();
      if (error) throw error;
      return data;
    },
  });

  const cards = [
    {
      icon: BookOpen,
      label: t(lesson ? "dashboard.resume.lesson" : "nav.learn"),
      title: lesson ? lesson.title[locale] || lesson.title.en : t("dashboard.resume.roadmap"),
      href: lesson ? `/learn/lesson/${encodeURIComponent(lesson.id)}` : "/learn",
    },
    {
      icon: ListChecks,
      label: t(problem ? "dashboard.resume.problem" : "nav.problems"),
      title: problem?.title || t("dashboard.resume.problems"),
      href: problem ? `/problems/${encodeURIComponent(problem.id)}` : "/problems",
    },
    {
      icon: Code2,
      label: t(local?.draft?.dirty ? "dashboard.resume.draft" : local?.draft || project.data ? "dashboard.resume.project" : "nav.editor"),
      title: local?.draft ? local.draft.title || t("repositories.untitled")
        : project.data ? project.data.title || t("repositories.untitled") : t("dashboard.resume.editor"),
      href: !local?.draft && project.data ? `/editor?project=${encodeURIComponent(project.data.id)}` : "/editor",
    },
  ];

  return (
    <section aria-labelledby="dashboard-resume-heading" className="space-y-3">
      <h2 id="dashboard-resume-heading" className="text-lg font-semibold">{t("dashboard.resume.title")}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, title, href }) => (
          <li key={label} className="min-w-0">
            <Link href={href} className="flex h-full min-w-0 items-start gap-3 rounded-[var(--sx-radius-card)] border bg-card p-4 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold wrap-anywhere">{title}</p>
              </div>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
