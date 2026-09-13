"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  FilePlus2,
  FileText,
  Network,
  PenTool,
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
    href: "/workspace/student/calendar",
    icon: CalendarDays,
    title: { en: "Planner", ro: "Planner" },
    description: {
      en: "See assignments and plan your own events and projects.",
      ro: "Vezi temele și planifică-ți propriile evenimente și proiecte.",
    },
  },
  {
    href: "/workspace/student/notes",
    icon: FileText,
    title: { en: "Notes", ro: "Notițe" },
    description: {
      en: "Write in Markdown and keep every lesson organized.",
      ro: "Scrie în Markdown și păstrează fiecare lecție organizată.",
    },
  },
  {
    href: "/workspace/student/whiteboard",
    icon: PenTool,
    title: { en: "Whiteboard", ro: "Whiteboard" },
    description: {
      en: "Sketch ideas, algorithms and visual explanations.",
      ro: "Schițează idei, algoritmi și explicații vizuale.",
    },
  },
  {
    href: "/workspace/student/graph",
    icon: Network,
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
    <div className="space-y-7 pb-6" data-tour="student-dashboard">
      <section
        className="rounded-[var(--sx-radius-panel)] border border-border bg-card px-6 py-8 sm:px-8 sm:py-9"
        data-tour="student-overview"
      >
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              {language === "ro" ? "Workspace elev" : "Student workspace"}
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {language === "ro" ? "Bine ai revenit" : "Welcome back"}
              {firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {language === "ro"
                ? "Notițele, desenele și grafurile tale stau acum lângă editorul de cod, într-un singur spațiu pentru școală."
                : "Your notes, sketches and graphs now live beside the code editor in one focused school space."}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={startNote}
            className="h-11 shrink-0"
          >
            <FilePlus2 className="size-4" />
            {language === "ro" ? "Notiță nouă" : "New note"}
          </Button>
        </div>
      </section>

      <section data-tour="student-tools">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {language === "ro" ? "Continuă de unde ai rămas" : "Continue where you left off"}
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group block">
                <Card className="h-full border-border bg-card shadow-none transition-colors duration-150 group-hover:bg-muted/30">
                  <CardContent className="p-5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-4.5" strokeWidth={1.8} />
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
                {language === "ro" ? "Sincronizate cu contul tău" : "Synced with your account"}
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
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="size-4" strokeWidth={1.8} />
                  </span>
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

        <Card className="border-border bg-card shadow-none">
          <CardContent className="flex h-full min-h-52 flex-col justify-between p-5">
            <div>
              <h2 className="text-lg font-semibold">
                {language === "ro" ? "Biblioteca ta" : "Your library"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {language === "ro"
                  ? `${notes.length} notițe recente și ${graphCount} grafuri salvate în acest workspace.`
                  : `${notes.length} recent notes and ${graphCount} saved graphs in this workspace.`}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 divide-x overflow-hidden rounded-lg border border-border">
              <div className="p-3">
                <p className="text-xs text-muted-foreground">{language === "ro" ? "Notițe" : "Notes"}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{notes.length}</p>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">{language === "ro" ? "Grafuri" : "Graphs"}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{graphCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
