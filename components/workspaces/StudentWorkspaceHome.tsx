"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  FilePlus2,
  FileText,
  GraduationCap,
  Network,
  PenTool,
  Sparkles,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  createNote,
  listGraphs,
  listNotes,
  subscribeWorkspaceStorage,
  type WorkspaceNote,
} from "@/lib/workspace-storage";

const quickActions = [
  {
    href: "/workspace/student/notes",
    icon: FileText,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    title: { en: "Notes", ro: "Notițe" },
    description: {
      en: "Write in Markdown and keep every lesson organized.",
      ro: "Scrie în Markdown și păstrează fiecare lecție organizată.",
    },
  },
  {
    href: "/workspace/student/whiteboard",
    icon: PenTool,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    title: { en: "Whiteboard", ro: "Whiteboard" },
    description: {
      en: "Sketch ideas, algorithms and visual explanations.",
      ro: "Schițează idei, algoritmi și explicații vizuale.",
    },
  },
  {
    href: "/workspace/student/graph",
    icon: Network,
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    title: { en: "Graph lab", ro: "Laborator de grafuri" },
    description: {
      en: "Turn an edge list into an interactive graph.",
      ro: "Transformă lista de muchii într-un graf interactiv.",
    },
  },
] as const;

export function StudentWorkspaceHome() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { profile, user } = useAuth();
  const language = locale === "ro" ? "ro" : "en";
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [graphCount, setGraphCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    setNotes(listNotes(user.id).slice(0, 4));
    setGraphCount(listGraphs(user.id).length);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    return subscribeWorkspaceStorage(user.id, refresh);
  }, [refresh, user]);

  function startNote() {
    if (!user) return;
    const note = createNote(user.id, {
      title: language === "ro" ? "Notiță fără titlu" : "Untitled note",
    });
    router.push(`/workspace/student/notes/${note.id}`);
  }

  const firstName = profile?.username || user?.email?.split("@")[0] || "";

  return (
    <div className="space-y-7 pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-950 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(14,165,233,0.3),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.24),transparent_28%)]" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80">
              <GraduationCap className="size-3.5" />
              {language === "ro" ? "Workspace elev" : "Student workspace"}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              {language === "ro" ? "Bine ai revenit" : "Welcome back"}
              {firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              {language === "ro"
                ? "Notițele, desenele și grafurile tale stau acum lângă editorul de cod, într-un singur spațiu pentru școală."
                : "Your notes, sketches and graphs now live beside the code editor in one focused school space."}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={startNote}
            className="h-12 shrink-0 bg-white text-zinc-950 hover:bg-white/90"
          >
            <FilePlus2 className="size-4" />
            {language === "ro" ? "Notiță nouă" : "New note"}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {language === "ro" ? "Instrumente" : "Tools"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {language === "ro" ? "Continuă de unde ai rămas" : "Continue where you left off"}
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group block">
                <Card className="h-full border-border/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-foreground/15 group-hover:shadow-md">
                  <CardContent className="p-5">
                    <span className={`flex size-10 items-center justify-center rounded-xl ${action.tone}`}>
                      <Icon className="size-5" />
                    </span>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{action.title[language]}</h3>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {action.description[language]}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">{language === "ro" ? "Notițe recente" : "Recent notes"}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {language === "ro" ? "Salvate automat în browser" : "Saved automatically in this browser"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/workspace/student/notes">
                {language === "ro" ? "Vezi toate" : "View all"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {notes.length ? (
              notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/workspace/student/notes/${note.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-muted/60"
                >
                  <span className="text-xl" aria-hidden="true">{note.icon || "📝"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{note.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
                        dateStyle: "medium",
                      }).format(new Date(note.updatedAt))}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <BookOpenCheck className="size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">
                  {language === "ro" ? "Prima pagină te așteaptă" : "Your first page is waiting"}
                </p>
                <Button className="mt-4" size="sm" onClick={startNote}>
                  <FilePlus2 className="size-4" />
                  {language === "ro" ? "Creează notiță" : "Create note"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-violet-500/15 bg-gradient-to-br from-violet-500/8 via-card to-sky-500/8">
          <CardContent className="flex h-full min-h-52 flex-col justify-between p-5">
            <div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <h2 className="mt-5 text-lg font-semibold">
                {language === "ro" ? "Biblioteca ta" : "Your library"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {language === "ro"
                  ? `${notes.length} notițe recente și ${graphCount} grafuri salvate în acest workspace.`
                  : `${notes.length} recent notes and ${graphCount} saved graphs in this workspace.`}
              </p>
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-sky-500" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
