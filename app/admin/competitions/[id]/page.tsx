"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlus,
  Copy,
  FileCode2,
  Link2,
  Plus,
  Save,
  Send,
  Trash2,
  Trophy,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
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
import type { CompetitionDetail } from "@/lib/competitionTypes";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";

type PlatformProblem = {
  id: string;
  code?: number | null;
  title_i18n: Record<string, string> | null;
  visibility?: string | null;
  competition_origin_id?: string | null;
};

type CustomTest = { input: string; output: string };
type CompetitionInvite = {
  id: string;
  label: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  revoked_at: string | null;
};

function toLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AdminCompetitionDetailContent() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const copy = ro
    ? {
        breakDefault: "Pauză",
        inviteDefault: "Invitație participanți",
        saved: "Competiția a fost salvată.",
        problemAdded: "Problema a fost adăugată.",
        invalidTest: "Input-ul fiecărui test trebuie să fie un array JSON valid.",
        customAdded: "Problema custom a fost creată.",
        breakAdded: "Pauza a fost adăugată.",
        inviteCreated: "Invitația a fost creată. Linkul este afișat o singură dată.",
        inviteRevoked: "Invitația a fost revocată.",
        problemRemoved: "Problema a fost eliminată.",
        pointsUpdated: "Punctajul a fost actualizat.",
        breakRemoved: "Pauza a fost eliminată.",
        loadFailed: "Competiția nu a putut fi încărcată.",
        pointsMax: "pct max",
        preview: "Preview",
        save: "Salvează",
        name: "Nume",
        access: "Acces",
        inviteOnly: "Cu invitație",
        status: "Status",
        published: "Publicată",
        cancelled: "Anulată",
        description: "Descriere",
        starts: "Începe",
        ends: "Se termină",
        reminder: "Reminder (minute)",
        liveLeaderboard: "Clasament live",
        problems: "Probleme",
        problemsDescription: "Punctajul maxim total este suma punctelor configurate aici.",
        custom: "Custom",
        chooseProblem: "Alege o problemă existentă",
        add: "Adaugă",
        competitionOnly: "Doar în competiție",
        publishAt: "Publicare",
        publicProblem: "Problemă publică",
        maxPoints: "Punctaj maxim",
        editProblem: "Editează problema",
        breaks: "Pauze",
        breaksDescription: "Submisiile sunt blocate server-side în aceste intervale.",
        breakTitle: "Titlu pauză",
        privateInvites: "Invitații private",
        invitesDescription: "Token-urile sunt stocate ca hash și afișate o singură dată.",
        maxUses: "Utilizări maxime",
        generate: "Generează",
        copyNow: "Copiază acum",
        copied: "Link copiat.",
        copyLink: "Copiază",
        uses: "utilizări",
        expires: "expiră",
        revoked: "Revocată",
        revoke: "Revocă",
        customTitle: "Problemă custom",
        customDescription: "Testele rămân private. Problema poate rămâne în concurs sau poate fi publicată ulterior.",
        problemTitle: "Titlul problemei",
        markdownPrompt: "Cerință în Markdown",
        neverPublish: "Doar în concurs",
        publishAfter: "Publică după concurs",
        scheduled: "Dată personalizată",
        publishNow: "Publică acum",
        privateTests: "Teste private",
        expectedOutput: "Output așteptat",
        cancel: "Anulează",
        creating: "Se creează...",
        create: "Creează",
      }
    : {
        breakDefault: "Break",
        inviteDefault: "Participant invite",
        saved: "Competition saved.",
        problemAdded: "Problem added.",
        invalidTest: "Each test input must be a valid JSON array.",
        customAdded: "Custom problem created.",
        breakAdded: "Break added.",
        inviteCreated: "Invite created. The link is shown only once.",
        inviteRevoked: "Invite revoked.",
        problemRemoved: "Problem removed.",
        pointsUpdated: "Points updated.",
        breakRemoved: "Break removed.",
        loadFailed: "Could not load the competition.",
        pointsMax: "pts max",
        preview: "Preview",
        save: "Save",
        name: "Name",
        access: "Access",
        inviteOnly: "Invite only",
        status: "Status",
        published: "Published",
        cancelled: "Cancelled",
        description: "Description",
        starts: "Starts",
        ends: "Ends",
        reminder: "Reminder (minutes)",
        liveLeaderboard: "Live leaderboard",
        problems: "Problems",
        problemsDescription: "The total maximum score is the sum of the points configured here.",
        custom: "Custom",
        chooseProblem: "Choose an existing problem",
        add: "Add",
        competitionOnly: "Competition only",
        publishAt: "Publish",
        publicProblem: "Public problem",
        maxPoints: "Maximum points",
        editProblem: "Edit problem",
        breaks: "Breaks",
        breaksDescription: "Submissions are blocked server-side during these intervals.",
        breakTitle: "Break title",
        privateInvites: "Private invites",
        invitesDescription: "Tokens are stored as hashes and displayed only once.",
        maxUses: "Maximum uses",
        generate: "Generate",
        copyNow: "Copy now",
        copied: "Link copied.",
        copyLink: "Copy",
        uses: "uses",
        expires: "expires",
        revoked: "Revoked",
        revoke: "Revoke",
        customTitle: "Custom problem",
        customDescription: "Tests stay private. Keep the problem in the competition or publish it later.",
        problemTitle: "Problem title",
        markdownPrompt: "Markdown prompt",
        neverPublish: "Competition only",
        publishAfter: "Publish after",
        scheduled: "Custom date",
        publishNow: "Publish now",
        privateTests: "Private tests",
        expectedOutput: "Expected output",
        cancel: "Cancel",
        creating: "Creating...",
        create: "Create",
      };
  const queryClient = useQueryClient();
  const queryKey = ["admin", "competition", id] as const;
  const [customOpen, setCustomOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [existingProblemId, setExistingProblemId] = useState("");
  const [existingPoints, setExistingPoints] = useState("100");
  const [breakForm, setBreakForm] = useState({ title: copy.breakDefault, startsAt: "", endsAt: "" });
  const [inviteForm, setInviteForm] = useState({ label: copy.inviteDefault, maxUses: "", expiresAt: "" });
  const [form, setForm] = useState({
    description: "",
    endsAt: "",
    name: "",
    reminderIntervalMinutes: "30",
    showLiveLeaderboard: true,
    startsAt: "",
    status: "draft",
    visibility: "public",
  });
  const [custom, setCustom] = useState({
    description: "",
    difficulty: "easy",
    maxPoints: "100",
    publishAt: "",
    publishMode: "never",
    starterCode: "",
    title: "",
  });
  const [tests, setTests] = useState<CustomTest[]>([{ input: "[]", output: "" }]);

  const query = useQuery<{
    competition: CompetitionDetail;
    availableProblems: PlatformProblem[];
    invites: CompetitionInvite[];
  }>({
    queryKey,
    queryFn: async () => {
      const [detail, problemResult, inviteResult] = await Promise.all([
        competitionApiFetch<{ competition: CompetitionDetail }>(`/api/competitions/${id}`),
        supabase
          .from("problems")
          .select("id, code, title_i18n, visibility, competition_origin_id")
          .order("created_at", { ascending: false }),
        competitionApiFetch<{ invites: CompetitionInvite[] }>(
          `/api/competitions/${id}/invites`
        ),
      ]);
      if (problemResult.error) throw problemResult.error;
      return {
        competition: detail.competition,
        availableProblems: (problemResult.data || []) as PlatformProblem[],
        invites: inviteResult.invites,
      };
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
  const competition = query.data?.competition;

  useEffect(() => {
    if (!competition) return;
    setForm({
      description: competition.description,
      endsAt: toLocal(competition.ends_at),
      name: competition.name,
      reminderIntervalMinutes: String(competition.reminder_interval_minutes),
      showLiveLeaderboard: competition.show_live_leaderboard,
      startsAt: toLocal(competition.starts_at),
      status: competition.status,
      visibility: competition.visibility,
    });
    if (!breakForm.startsAt && !breakForm.endsAt) {
      setBreakForm((current) => ({
        ...current,
        startsAt: toLocal(competition.starts_at),
        endsAt: toLocal(competition.ends_at),
      }));
    }
  }, [competition, breakForm.startsAt, breakForm.endsAt]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["admin", "competitions"] });
    void queryClient.invalidateQueries({ queryKey: ["competitions"] });
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      competitionApiFetch(`/api/competitions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          endsAt: new Date(form.endsAt).toISOString(),
          reminderIntervalMinutes: Number(form.reminderIntervalMinutes),
          startsAt: new Date(form.startsAt).toISOString(),
        }),
      }),
    onSuccess: async () => { toast.success(copy.saved); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const existingMutation = useMutation({
    mutationFn: () =>
      competitionApiFetch(`/api/competitions/${id}/problems`, {
        method: "POST",
        body: JSON.stringify({ source: "existing", problemId: existingProblemId, maxPoints: Number(existingPoints) }),
      }),
    onSuccess: async () => { toast.success(copy.problemAdded); setExistingProblemId(""); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const customMutation = useMutation({
    mutationFn: () => {
      const testCases = tests.map((test) => {
        let input: unknown;
        try { input = JSON.parse(test.input); } catch { throw new Error(copy.invalidTest); }
        return { input, output: test.output };
      });
      return competitionApiFetch(`/api/competitions/${id}/problems`, {
        method: "POST",
        body: JSON.stringify({
          source: "custom",
          titleI18n: { ro: custom.title, en: custom.title },
          descriptionI18n: { ro: custom.description, en: custom.description },
          starterCode: custom.starterCode,
          difficulty: custom.difficulty,
          maxPoints: Number(custom.maxPoints),
          publishMode: custom.publishMode,
          publishAt: custom.publishAt ? new Date(custom.publishAt).toISOString() : null,
          testCases,
        }),
      });
    },
    onSuccess: async () => { toast.success(copy.customAdded); setCustomOpen(false); setCustom((current) => ({ ...current, description: "", starterCode: "", title: "" })); setTests([{ input: "[]", output: "" }]); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const breakMutation = useMutation({
    mutationFn: () => competitionApiFetch(`/api/competitions/${id}/breaks`, { method: "POST", body: JSON.stringify({ ...breakForm, startsAt: new Date(breakForm.startsAt).toISOString(), endsAt: new Date(breakForm.endsAt).toISOString() }) }),
    onSuccess: async () => { toast.success(copy.breakAdded); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const inviteMutation = useMutation({
    mutationFn: () => competitionApiFetch<{ token: string }>(`/api/competitions/${id}/invites`, { method: "POST", body: JSON.stringify({ label: inviteForm.label, maxUses: inviteForm.maxUses || null, expiresAt: inviteForm.expiresAt ? new Date(inviteForm.expiresAt).toISOString() : null }) }),
    onSuccess: async ({ token }) => { setInviteToken(token); toast.success(copy.inviteCreated); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      competitionApiFetch(`/api/competitions/${id}/invites`, {
        method: "DELETE",
        body: JSON.stringify({ inviteId }),
      }),
    onSuccess: async () => {
      toast.success(copy.inviteRevoked);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const removeProblemMutation = useMutation({
    mutationFn: (linkId: string) => competitionApiFetch(`/api/competitions/${id}/problems`, { method: "DELETE", body: JSON.stringify({ linkId }) }),
    onSuccess: async () => { toast.success(copy.problemRemoved); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const updatePointsMutation = useMutation({
    mutationFn: (input: { linkId: string; maxPoints: number }) =>
      competitionApiFetch(`/api/competitions/${id}/problems`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      toast.success(copy.pointsUpdated);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const removeBreakMutation = useMutation({
    mutationFn: (breakId: string) => competitionApiFetch(`/api/competitions/${id}/breaks`, { method: "DELETE", body: JSON.stringify({ breakId }) }),
    onSuccess: async () => { toast.success(copy.breakRemoved); await refresh(); },
    onError: (error) => toast.error(error.message),
  });

  const usedIds = useMemo(() => new Set((competition?.problems || []).map((item) => item.problem_id)), [competition?.problems]);
  const availableProblems = (query.data?.availableProblems || []).filter((problem) => !usedIds.has(problem.id) && !problem.competition_origin_id);
  const inviteUrl = inviteToken && typeof window !== "undefined" ? `${window.location.origin}/competitions/${id}?invite=${encodeURIComponent(inviteToken)}` : null;

  if (query.isPending) return <div className="space-y-4 p-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  if (query.isError || !competition) return <div className="p-8 text-center text-sm text-destructive">{copy.loadFailed}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="size-4" />Competition editor</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{competition.name}</h1><div className="mt-3 flex gap-2"><Badge variant={competition.status === "published" ? "default" : "secondary"}>{competition.status}</Badge><Badge variant="outline">{competition.visibility}</Badge><Badge variant="secondary">{competition.maximumPoints} {copy.pointsMax}</Badge></div></div><div className="flex gap-2"><Button variant="outline" asChild><a href={`/competitions/${id}`} target="_blank" rel="noreferrer">{copy.preview}</a></Button><Button className="gap-2" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}><Save className="size-4" />{copy.save}</Button></div></header>

      <Card><CardContent className="grid gap-4 p-5"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">{copy.name}</label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label className="text-sm font-medium">{copy.access}</label><Select value={form.visibility} onValueChange={(value) => setForm((current) => ({ ...current, visibility: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="private">{copy.inviteOnly}</SelectItem></SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">{copy.status}</label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">{copy.published}</SelectItem><SelectItem value="cancelled">{copy.cancelled}</SelectItem></SelectContent></Select></div></div></div><div className="space-y-2"><label className="text-sm font-medium">{copy.description}</label><Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_minmax(250px,1fr)_180px_180px]"><div className="space-y-2"><label className="text-sm font-medium">{copy.starts}</label><DateTimePicker locale={ro ? "ro" : "en"} value={form.startsAt} onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))} placeholder={copy.starts} /></div><div className="space-y-2"><label className="text-sm font-medium">{copy.ends}</label><DateTimePicker locale={ro ? "ro" : "en"} value={form.endsAt} onChange={(endsAt) => setForm((current) => ({ ...current, endsAt }))} placeholder={copy.ends} /></div><div className="space-y-2"><label className="text-sm font-medium">{copy.reminder}</label><Input type="number" min={5} max={180} value={form.reminderIntervalMinutes} onChange={(event) => setForm((current) => ({ ...current, reminderIntervalMinutes: event.target.value }))} /></div><div className="flex items-end"><label className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border px-3 text-sm"><span>{copy.liveLeaderboard}</span><input type="checkbox" checked={form.showLiveLeaderboard} onChange={(event) => setForm((current) => ({ ...current, showLiveLeaderboard: event.target.checked }))} className="size-4 accent-foreground" /></label></div></div></CardContent></Card>

      <section className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold">{copy.problems}</h2><p className="mt-1 text-sm text-muted-foreground">{copy.problemsDescription}</p></div><Button onClick={() => setCustomOpen(true)} className="gap-2"><FileCode2 className="size-4" />{copy.custom}</Button></div><Card><CardContent className="space-y-4 p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]"><Select value={existingProblemId} onValueChange={setExistingProblemId}><SelectTrigger><SelectValue placeholder={copy.chooseProblem} /></SelectTrigger><SelectContent>{availableProblems.map((problem) => <SelectItem key={problem.id} value={problem.id}>{problem.code != null ? `#${problem.code} ` : ""}{getLocalized(problem.title_i18n, locale)}</SelectItem>)}</SelectContent></Select><Input type="number" min={1} value={existingPoints} onChange={(event) => setExistingPoints(event.target.value)} /><Button disabled={!existingProblemId || existingMutation.isPending} onClick={() => existingMutation.mutate()} className="gap-2"><Plus className="size-4" />{copy.add}</Button></div><div className="space-y-2">{competition.problems.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{getLocalized(item.problem.title_i18n, locale)}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.problem.visibility === "competition" ? copy.competitionOnly : item.problem.publish_at ? `${copy.publishAt}: ${new Date(item.problem.publish_at).toLocaleString(ro ? "ro-RO" : "en-US")}` : copy.publicProblem}</p></div><Input aria-label={copy.maxPoints} className="h-8 w-20" type="number" min={1} max={10000} defaultValue={item.max_points} onBlur={(event) => { const maxPoints = Number(event.target.value); if (maxPoints !== item.max_points) updatePointsMutation.mutate({ linkId: item.id, maxPoints }); }} /><Button size="icon-sm" variant="ghost" asChild title={copy.editProblem}><a href={`/admin/problems/${item.problem_id}`}><FileCode2 className="size-4" /></a></Button><Button size="icon-sm" variant="ghost" onClick={() => removeProblemMutation.mutate(item.id)}><Trash2 className="size-4" /></Button></div>)}</div></CardContent></Card></section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3"><div><h2 className="text-xl font-semibold">{copy.breaks}</h2><p className="mt-1 text-sm text-muted-foreground">{copy.breaksDescription}</p></div><Card><CardContent className="space-y-3 p-5"><Input value={breakForm.title} onChange={(event) => setBreakForm((current) => ({ ...current, title: event.target.value }))} placeholder={copy.breakTitle} /><div className="grid gap-3"><DateTimePicker locale={ro ? "ro" : "en"} value={breakForm.startsAt} onChange={(startsAt) => setBreakForm((current) => ({ ...current, startsAt }))} placeholder={copy.starts} /><DateTimePicker locale={ro ? "ro" : "en"} value={breakForm.endsAt} onChange={(endsAt) => setBreakForm((current) => ({ ...current, endsAt }))} placeholder={copy.ends} /></div><Button variant="outline" className="w-full gap-2" onClick={() => breakMutation.mutate()} disabled={breakMutation.isPending}><CalendarPlus className="size-4" />{copy.add}</Button>{competition.breaks.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{new Date(item.starts_at).toLocaleString(ro ? "ro-RO" : "en-US")} – {new Date(item.ends_at).toLocaleTimeString(ro ? "ro-RO" : "en-US")}</p></div><Button size="icon-sm" variant="ghost" onClick={() => removeBreakMutation.mutate(item.id)}><Trash2 className="size-4" /></Button></div>)}</CardContent></Card></section>
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{copy.privateInvites}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.invitesDescription}</p>
          </div>
          <Card>
            <CardContent className="space-y-3 p-5">
              <Input value={inviteForm.label} onChange={(event) => setInviteForm((current) => ({ ...current, label: event.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min={1} placeholder={copy.maxUses} value={inviteForm.maxUses} onChange={(event) => setInviteForm((current) => ({ ...current, maxUses: event.target.value }))} />
                <DateTimePicker allowClear locale={ro ? "ro" : "en"} value={inviteForm.expiresAt} onChange={(expiresAt) => setInviteForm((current) => ({ ...current, expiresAt }))} placeholder={copy.expires} />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
                <Link2 className="size-4" />{copy.generate}
              </Button>
              {inviteUrl && (
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{copy.copyNow}</p>
                  <p className="mt-2 break-all font-mono text-xs">{inviteUrl}</p>
                  <Button size="sm" className="mt-3 gap-2" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); toast.success(copy.copied); }}>
                    <Copy className="size-4" />{copy.copyLink}
                  </Button>
                </div>
              )}
              {(query.data?.invites || []).map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {invite.uses_count}/{invite.max_uses ?? "∞"} {copy.uses}
                      {invite.expires_at ? ` · ${copy.expires} ${new Date(invite.expires_at).toLocaleString(ro ? "ro-RO" : "en-US")}` : ""}
                    </p>
                  </div>
                  {invite.revoked_at ? (
                    <Badge variant="secondary">{copy.revoked}</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => revokeInviteMutation.mutate(invite.id)}>
                      {copy.revoke}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{copy.customTitle}</DialogTitle><DialogDescription>{copy.customDescription}</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]"><Input placeholder={copy.problemTitle} value={custom.title} onChange={(event) => setCustom((current) => ({ ...current, title: event.target.value }))} /><Input type="number" min={1} value={custom.maxPoints} onChange={(event) => setCustom((current) => ({ ...current, maxPoints: event.target.value }))} /></div><Textarea placeholder={copy.markdownPrompt} rows={8} value={custom.description} onChange={(event) => setCustom((current) => ({ ...current, description: event.target.value }))} /><div className="overflow-hidden rounded-xl border"><div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">Starter code</div><MiniScriptMonacoEditor height="220px" value={custom.starterCode} onChange={(value) => setCustom((current) => ({ ...current, starterCode: value }))} /></div><div className="grid gap-3 sm:grid-cols-2"><Select value={custom.difficulty} onValueChange={(value) => setCustom((current) => ({ ...current, difficulty: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent></Select><Select value={custom.publishMode} onValueChange={(value) => setCustom((current) => ({ ...current, publishMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="never">{copy.neverPublish}</SelectItem><SelectItem value="after">{copy.publishAfter}</SelectItem><SelectItem value="scheduled">{copy.scheduled}</SelectItem><SelectItem value="now">{copy.publishNow}</SelectItem></SelectContent></Select>{custom.publishMode === "scheduled" && <div className="sm:col-span-2"><DateTimePicker locale={ro ? "ro" : "en"} value={custom.publishAt} onChange={(publishAt) => setCustom((current) => ({ ...current, publishAt }))} placeholder={copy.scheduled} /></div>}</div><div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{copy.privateTests}</p><Button size="sm" variant="outline" onClick={() => setTests((current) => [...current, { input: "[]", output: "" }])}><Plus className="size-4" />Test</Button></div>{tests.map((test, index) => <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input className="font-mono" value={test.input} onChange={(event) => setTests((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, input: event.target.value } : item))} placeholder='Input JSON, ex. [1, 2]' /><Input className="font-mono" value={test.output} onChange={(event) => setTests((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, output: event.target.value } : item))} placeholder={copy.expectedOutput} /><Button size="icon-sm" variant="ghost" disabled={tests.length === 1} onClick={() => setTests((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" /></Button></div>)}</div></div><DialogFooter><Button variant="outline" onClick={() => setCustomOpen(false)}>{copy.cancel}</Button><Button className="gap-2" disabled={!custom.title.trim() || !custom.description.trim() || customMutation.isPending} onClick={() => customMutation.mutate()}><Send className="size-4" />{customMutation.isPending ? copy.creating : copy.create}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

export default function AdminCompetitionDetailPage() {
  return <RouteGuard requireAuth requireAdmin><AdminCompetitionDetailContent /></RouteGuard>;
}
