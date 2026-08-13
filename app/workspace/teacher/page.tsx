"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Presentation,
  Sparkles,
  UsersRound,
} from "lucide-react";

import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherWorkspacePage() {
  return (
    <RouteGuard requireAuth>
      <TeacherWorkspacePreview />
    </RouteGuard>
  );
}

function TeacherWorkspacePreview() {
  const { locale } = useLanguage();
  const ro = locale === "ro";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(139,92,246,0.34),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.22),transparent_30%)]" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
            <Sparkles className="size-3.5" />
            {ro ? "Preview · etapa următoare" : "Preview · coming next"}
          </span>
          <span className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/30">
            <Presentation className="size-6" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            {ro ? "Workspace-ul pentru profesori este pregătit pentru următorul capitol." : "The teacher workspace is ready for its next chapter."}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">
            {ro
              ? "Modelul de cont și switcher-ul sunt deja active. În etapa următoare adăugăm planuri de lecție, distribuirea materialelor și colaborarea live cu elevii."
              : "The account model and workspace switcher are already active. Next we will add lesson plans, material sharing and live student collaboration."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="bg-white text-zinc-950 hover:bg-white/90">
              <Link href="/workspace/student">
                {ro ? "Explorează instrumentele de elev" : "Explore student tools"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/dashboard">{ro ? "Workspace personal" : "Personal workspace"}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            icon: BookOpenCheck,
            title: ro ? "Planuri și materiale" : "Plans and materials",
            text: ro ? "Creează lecții reutilizabile și distribuie notițe clasei." : "Create reusable lessons and share notes with a class.",
          },
          {
            icon: UsersRound,
            title: ro ? "Colaborare live" : "Live collaboration",
            text: ro ? "Whiteboard și cod sincronizate pentru profesori și elevi." : "Synchronized whiteboards and code for teachers and students.",
          },
        ].map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardContent className="p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-5 font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
