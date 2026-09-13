"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  Download,
  LockKeyhole,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { competitionApiFetch } from "@/lib/competitionClient";
import type { CompetitionSummary } from "@/lib/competitionTypes";
import { supabase } from "@/lib/supabase";

function datetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AdminCompetitionsContent() {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const copy = language === "ro"
    ? {
        title: "Competiții",
        subtitle: "Configurează programul, problemele, invitațiile, pauzele și clasamentele.",
        new: "Nouă",
        emptyTitle: "Nicio competiție configurată",
        emptyDescription: "Creează un draft, adaugă probleme și publică-l când este gata.",
        participants: "participanți",
        problems: "probleme",
        points: "pct",
        manage: "Gestionează",
        createTitle: "Competiție nouă",
        createDescription: "Va fi salvată ca draft. Problemele și pauzele se adaugă după creare.",
        name: "Nume",
        description: "Descriere",
        starts: "Începe",
        ends: "Se termină",
        registrationDeadline: "Termen înscriere",
        registrationDeadlineOptional: "Termen înscriere (opțional)",
        registrationDeadlineHint: "Dacă rămâne gol, înscrierile se închid la finalul competiției.",
        noRegistrationDeadline: "Fără termen separat · deschisă până la final",
        access: "Acces",
        public: "Public",
        private: "Cu invitație",
        reminder: "Reminder",
        minutes: "minute",
        cancel: "Anulează",
        create: "Creează",
        creating: "Se creează...",
        created: "Competiția a fost creată ca draft.",
        exportFailed: "Exportul nu a putut fi generat.",
      }
    : {
        title: "Competitions",
        subtitle: "Configure schedules, problems, invites, breaks, and leaderboards.",
        new: "New",
        emptyTitle: "No competitions yet",
        emptyDescription: "Create a draft, add problems, and publish it when ready.",
        participants: "participants",
        problems: "problems",
        points: "pts",
        manage: "Manage",
        createTitle: "New competition",
        createDescription: "It will be saved as a draft. Add problems and breaks after creation.",
        name: "Name",
        description: "Description",
        starts: "Starts",
        ends: "Ends",
        registrationDeadline: "Registration deadline",
        registrationDeadlineOptional: "Registration deadline (optional)",
        registrationDeadlineHint: "Leave empty to keep registration open until the competition ends.",
        noRegistrationDeadline: "No separate deadline · open until the end",
        access: "Access",
        public: "Public",
        private: "Invite only",
        reminder: "Reminder",
        minutes: "minutes",
        cancel: "Cancel",
        create: "Create",
        creating: "Creating...",
        created: "Competition created as a draft.",
        exportFailed: "Could not generate the export.",
      };
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      description: "",
      endsAt: datetimeLocal(new Date(Date.now() + 26 * 60 * 60 * 1000)),
      name: "",
      registrationEndsAt: "",
      reminderIntervalMinutes: "30",
      startsAt: datetimeLocal(startsAt),
      visibility: "public",
    };
  });

  const competitionsQuery = useQuery<{ competitions: CompetitionSummary[] }>({
    queryKey: ["admin", "competitions"],
    queryFn: () => competitionApiFetch("/api/competitions?scope=admin"),
    staleTime: 30_000,
  });
  const createMutation = useMutation({
    mutationFn: () =>
      competitionApiFetch<{ competition: { id: string } }>("/api/competitions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          endsAt: new Date(form.endsAt).toISOString(),
          registrationEndsAt: form.registrationEndsAt
            ? new Date(form.registrationEndsAt).toISOString()
            : null,
          reminderIntervalMinutes: Number(form.reminderIntervalMinutes),
          startsAt: new Date(form.startsAt).toISOString(),
          status: "draft",
        }),
      }),
    onSuccess: async () => {
      toast.success(copy.created);
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin", "competitions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  async function downloadLeaderboard(competition: CompetitionSummary) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch(`/api/competitions/${competition.id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      toast.error(copy.exportFailed);
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${competition.slug}-leaderboard.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const competitions = competitionsQuery.data?.competitions || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="size-4" />Competition control</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="size-4" />{copy.new}</Button>
      </header>



      {competitionsQuery.isPending ? (
        <div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      ) : !competitions.length ? (
        <Card><CardContent className="py-14 text-center"><Trophy className="mx-auto size-9 text-muted-foreground/50" /><h2 className="mt-4 font-semibold">{copy.emptyTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{copy.emptyDescription}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {competitions.map((competition) => (
            <Card key={competition.id} className="gap-0 py-0 shadow-sm"><CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{competition.name}</h2><Badge variant={competition.status === "published" ? "default" : "secondary"}>{competition.status}</Badge>{competition.visibility === "private" && <Badge variant="outline" className="gap-1"><LockKeyhole className="size-3" />Private</Badge>}</div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarClock className="size-3.5" />{new Date(competition.starts_at).toLocaleString(language === "ro" ? "ro-RO" : "en-US")}</span><span className="flex items-center gap-1.5"><CalendarClock className="size-3.5" />{competition.registration_ends_at ? `${copy.registrationDeadline}: ${new Date(competition.registration_ends_at).toLocaleString(language === "ro" ? "ro-RO" : "en-US")}` : copy.noRegistrationDeadline}</span><span className="flex items-center gap-1.5"><Users className="size-3.5" />{competition.participantCount} {copy.participants}</span><span>{competition.problemCount} {copy.problems} · {competition.maximumPoints} {copy.points}</span></div></div><div className="flex gap-2"><Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadLeaderboard(competition)}><Download className="size-4" />CSV</Button><Button asChild size="sm" className="gap-2"><Link href={`/admin/competitions/${competition.id}`}>{copy.manage}<ChevronRight className="size-4" /></Link></Button></div></CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{copy.createTitle}</DialogTitle><DialogDescription>{copy.createDescription}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><label className="text-sm font-medium">{copy.name}</label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{copy.description}</label><Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} /></div>
            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><label className="text-sm font-medium">{copy.starts}</label><DateTimePicker locale={language} value={form.startsAt} onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))} placeholder={copy.starts} /></div><div className="space-y-2"><label className="text-sm font-medium">{copy.ends}</label><DateTimePicker locale={language} value={form.endsAt} onChange={(endsAt) => setForm((current) => ({ ...current, endsAt }))} placeholder={copy.ends} /></div><div className="space-y-2"><label className="text-sm font-medium">{copy.registrationDeadlineOptional}</label><DateTimePicker allowClear locale={language} value={form.registrationEndsAt} onChange={(registrationEndsAt) => setForm((current) => ({ ...current, registrationEndsAt }))} placeholder={copy.registrationDeadlineOptional} /><p className="text-xs leading-5 text-muted-foreground">{copy.registrationDeadlineHint}</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">{copy.access}</label><Select value={form.visibility} onValueChange={(value) => setForm((current) => ({ ...current, visibility: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">{copy.public}</SelectItem><SelectItem value="private">{copy.private}</SelectItem></SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">{copy.reminder}</label><Select value={form.reminderIntervalMinutes} onValueChange={(value) => setForm((current) => ({ ...current, reminderIntervalMinutes: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 {copy.minutes}</SelectItem><SelectItem value="30">30 {copy.minutes}</SelectItem><SelectItem value="60">60 {copy.minutes}</SelectItem></SelectContent></Select></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>{copy.cancel}</Button><Button disabled={!form.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? copy.creating : copy.create}</Button></DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

export default function AdminCompetitionsPage() {
  return <RouteGuard requireAuth requireAdmin><AdminCompetitionsContent /></RouteGuard>;
}
