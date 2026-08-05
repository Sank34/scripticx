"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Medal,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

import RouteGuard from "@/components/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { competitionApiFetch } from "@/lib/competitionClient";
import type { CompetitionSummary } from "@/lib/competitionTypes";

const phaseLabels = {
  ro: {
    break: "Pauză",
    cancelled: "Anulată",
    draft: "Draft",
    finished: "Încheiată",
    live: "Live",
    upcoming: "În curând",
  },
  en: {
    break: "Break",
    cancelled: "Cancelled",
    draft: "Draft",
    finished: "Finished",
    live: "Live",
    upcoming: "Upcoming",
  },
};

function CompetitionsContent() {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const query = useQuery<{ competitions: CompetitionSummary[] }>({
    queryKey: ["competitions", "list"],
    queryFn: () => competitionApiFetch("/api/competitions"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const competitions = query.data?.competitions || [];
  const live = competitions.filter(
    (competition) => competition.phase === "live" || competition.phase === "break"
  );
  const upcoming = competitions.filter((competition) => competition.phase === "upcoming");
  const finished = competitions.filter((competition) => competition.phase === "finished");

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2">
      <header className="rounded-2xl border border-zinc-200 bg-zinc-950 px-6 py-7 text-white md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              <Trophy className="size-4" /> ScripticX arena
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {language === "ro" ? "Competiții de programare" : "Programming competitions"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {language === "ro"
                ? "Rezolvă probleme contra cronometru, urmărește clasamentul și păstrează fiecare soluție trimisă."
                : "Solve timed problems, follow the ranking and keep every submitted solution."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [live.length, language === "ro" ? "live" : "live"],
              [upcoming.length, language === "ro" ? "viitoare" : "upcoming"],
              [finished.length, language === "ro" ? "încheiate" : "finished"],
            ].map(([value, label]) => (
              <div key={String(label)} className="rounded-xl border border-zinc-800 px-4 py-3">
                <p className="text-xl font-semibold">{value}</p>
                <p className="text-[11px] text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Card><CardContent className="p-8 text-center text-sm text-red-600">{language === "ro" ? "Nu am putut încărca competițiile." : "Could not load competitions."}</CardContent></Card>
      ) : !competitions.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Medal className="size-10 text-zinc-300" />
            <h2 className="mt-4 text-lg font-semibold">
              {language === "ro" ? "Nu există competiții publicate" : "No published competitions"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              {language === "ro"
                ? "Când un administrator publică prima competiție, o vei găsi aici."
                : "The first published competition will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitions.map((competition) => (
            <Card key={competition.id} className="gap-0 overflow-hidden py-0 shadow-sm">
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                    <Trophy className="size-5" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {competition.visibility === "private" && (
                      <Badge variant="outline" className="gap-1"><LockKeyhole className="size-3" /> Private</Badge>
                    )}
                    {competition.isParticipant && <Badge variant="secondary">{language === "ro" ? "Înscris" : "Joined"}</Badge>}
                    <Badge
                      className={
                        competition.phase === "live"
                          ? "bg-red-600 text-white hover:bg-red-600"
                          : competition.phase === "break"
                            ? "bg-amber-500 text-white hover:bg-amber-500"
                            : ""
                      }
                      variant={competition.phase === "live" || competition.phase === "break" ? "default" : "secondary"}
                    >
                      {phaseLabels[language][competition.phase]}
                    </Badge>
                  </div>
                </div>

                <h2 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">
                  {competition.name}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                  {competition.description || "ScripticX coding competition"}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-zinc-600 sm:grid-cols-4">
                  <span className="flex items-center gap-1.5"><CalendarClock className="size-3.5" />{new Date(competition.starts_at).toLocaleDateString(language === "ro" ? "ro-RO" : "en-US")}</span>
                  <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Date(competition.starts_at).toLocaleTimeString(language === "ro" ? "ro-RO" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex items-center gap-1.5"><Users className="size-3.5" />{competition.participantCount}</span>
                  <span className="flex items-center gap-1.5"><Medal className="size-3.5" />{competition.maximumPoints} {language === "ro" ? "pct" : "pts"}</span>
                </div>

                <Button asChild className="mt-6 w-full justify-between" variant="outline">
                  <Link href={`/competitions/${competition.id}`}>
                    {language === "ro" ? "Deschide" : "Open"}
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompetitionsPage() {
  return (
    <RouteGuard requireAuth>
      <CompetitionsContent />
    </RouteGuard>
  );
}
