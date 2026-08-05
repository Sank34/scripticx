"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Clock3,
  Code2,
  Crown,
  LockKeyhole,
  Medal,
  PauseCircle,
  Play,
  Send,
  Trophy,
  Users,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import RouteGuard from "@/components/RouteGuard";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { SubmissionHistory } from "@/components/problems/SubmissionHistory";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCompetitionDuration,
  getRemainingMilliseconds,
} from "@/lib/competitions";
import { competitionApiFetch } from "@/lib/competitionClient";
import type {
  CompetitionDetail,
  CompetitionLeaderboardEntry,
  CompetitionSubmission,
} from "@/lib/competitionTypes";
import { getLocalized } from "@/lib/getLocalized";

type SubmissionResponse = {
  submission: CompetitionSubmission;
  results: Array<{ passed: boolean }>;
};

function CompetitionDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const ro = language === "ro";
  const copy = ro
    ? {
        loadFailed: "Competiția nu a putut fi încărcată.",
        privateDescription: "Această competiție este privată. Introdu codul primit de la organizator.",
        inviteCode: "Cod de invitație",
        checking: "Se verifică...",
        accept: "Acceptă",
        timeRemaining: "Timp rămas",
        pointsMax: "pct max",
        breakTitle: "Competiția este în pauză",
        breakDescription: "Editorul rămâne disponibil, dar submisiile sunt blocate până la finalul pauzei.",
        joinTitle: "Participă la competiție",
        joinDescription: "Înscrie-te pentru a trimite soluții și a intra în clasament.",
        joining: "Se înscrie...",
        join: "Înscrie-mă",
        ranking: "Clasament",
        submissions: "Submisii",
        hiddenProblems: "Problemele vor fi dezvăluite când începe competiția.",
        problems: "Probleme",
        paused: "Pauză",
        submit: "Trimite",
        prompt: "Cerință",
        points: "pct",
        participants: "Participanți",
        maximumScore: "Punctaj maxim",
        schedule: "Program",
        starts: "Începe",
        ends: "Se încheie",
        breaks: "Pauze",
        leaderboardHidden: "Clasamentul live este ascuns până la finalul competiției.",
        leaderboardTitle: "Clasamentul competiției",
        leaderboardDescription: "Pozițiile sunt calculate automat din cel mai bun punctaj pentru fiecare problemă.",
        leaderboardEmpty: "Clasamentul este încă gol.",
        gold: "Aur",
        silver: "Argint",
        bronze: "Bronz",
        solved: "rezolvate",
        mySubmissions: "Submisiile mele",
        submissionDescription: "Fiecare încercare păstrează punctajul și codul exact trimis.",
        problem: "Problemă",
      }
    : {
        loadFailed: "Could not load the competition.",
        privateDescription: "This competition is private. Enter the code provided by the organizer.",
        inviteCode: "Invite code",
        checking: "Checking...",
        accept: "Accept",
        timeRemaining: "Time remaining",
        pointsMax: "pts max",
        breakTitle: "Competition break",
        breakDescription: "The editor remains available, but submissions are paused until the break ends.",
        joinTitle: "Join the competition",
        joinDescription: "Join to submit solutions and enter the leaderboard.",
        joining: "Joining...",
        join: "Join",
        ranking: "Leaderboard",
        submissions: "Submissions",
        hiddenProblems: "Problems will be revealed when the competition starts.",
        problems: "Problems",
        paused: "Paused",
        submit: "Submit",
        prompt: "Prompt",
        points: "pts",
        participants: "Participants",
        maximumScore: "Maximum score",
        schedule: "Schedule",
        starts: "Starts",
        ends: "Ends",
        breaks: "Breaks",
        leaderboardHidden: "The live leaderboard is hidden until the competition ends.",
        leaderboardTitle: "Competition leaderboard",
        leaderboardDescription: "Ranks are calculated automatically from each participant's best score per problem.",
        leaderboardEmpty: "The leaderboard is empty for now.",
        gold: "Gold",
        silver: "Silver",
        bronze: "Bronze",
        solved: "solved",
        mySubmissions: "My submissions",
        submissionDescription: "Every attempt keeps its score and exact submitted code.",
        problem: "Problem",
      };
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [inviteCode, setInviteCode] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [codeByProblem, setCodeByProblem] = useState<Record<string, string>>({});
  const [lastResults, setLastResults] = useState<Record<string, Array<{ passed: boolean }>>>({});
  const [isNarrowArena, setIsNarrowArena] = useState(false);
  const [activeTab, setActiveTab] = useState("arena");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const updateLayout = () => setIsNarrowArena(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    const invitation = searchParams.get("invite");
    if (invitation) setInviteCode(invitation.slice(0, 200));
  }, [searchParams]);

  const detailKey = ["competitions", "detail", id] as const;
  const detailQuery = useQuery<{ competition: CompetitionDetail }>({
    queryKey: detailKey,
    queryFn: () => competitionApiFetch(`/api/competitions/${id}`),
    enabled: Boolean(id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const competition = detailQuery.data?.competition;

  const submissionsKey = ["competitions", "submissions", id] as const;
  const submissionsQuery = useQuery<{ submissions: CompetitionSubmission[] }>({
    queryKey: submissionsKey,
    queryFn: () => competitionApiFetch(`/api/competitions/${id}/submissions`),
    enabled: Boolean(id && competition?.isParticipant),
    staleTime: 15_000,
  });
  const leaderboardQuery = useQuery<{
    leaderboard: CompetitionLeaderboardEntry[];
  }>({
    queryKey: ["competitions", "leaderboard", id],
    queryFn: () => competitionApiFetch(`/api/competitions/${id}/leaderboard`),
    enabled: Boolean(
      id &&
        competition?.access === "full" &&
        (competition.show_live_leaderboard || competition.phase === "finished")
    ),
    staleTime: 15_000,
    refetchInterval:
      competition?.phase === "live" || competition?.phase === "break" ? 20_000 : false,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!competition?.problems.length || selectedProblemId) return;
    const first = competition.problems[0];
    setSelectedProblemId(first.id);
    setCodeByProblem((current) => ({
      ...current,
      [first.id]: current[first.id] ?? first.problem.starter_code,
    }));
  }, [competition?.problems, selectedProblemId]);

  useEffect(() => {
    const activeCompetition = competition;
    if (!activeCompetition?.isParticipant || activeCompetition.phase !== "live") return;
    const liveCompetition: CompetitionDetail = activeCompetition;

    function notifyTimeSlot() {
      const interval = liveCompetition.reminder_interval_minutes || 30;
      const elapsedMinutes = Math.floor(
        (Date.now() - Date.parse(liveCompetition.starts_at)) / 60_000
      );
      const slot = Math.floor(elapsedMinutes / interval);
      if (slot < 1) return;
      const key = `competition-reminder:${liveCompetition.id}:${slot}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "shown");
      const remaining = formatCompetitionDuration(
        getRemainingMilliseconds(liveCompetition.ends_at)
      );
      const message =
        language === "ro"
          ? `Mai sunt ${remaining} din competiție.`
          : `${remaining} remain in the competition.`;
      toast.info(message);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(
          `${liveCompetition.name}: ${language === "ro" ? "timp rămas" : "time remaining"}`,
          { body: message }
        );
      }
    }

    notifyTimeSlot();
    const interval = window.setInterval(notifyTimeSlot, 30_000);
    return () => window.clearInterval(interval);
  }, [competition, language]);

  const joinMutation = useMutation({
    mutationFn: () =>
      competitionApiFetch<{ joined: boolean }>(`/api/competitions/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: async () => {
      toast.success(language === "ro" ? "Te-ai înscris în competiție." : "You joined the competition.");
      await queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: ["competitions", "list"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: async (problemId: string) =>
      competitionApiFetch<SubmissionResponse>(`/api/competitions/${id}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          code: codeByProblem[problemId] || "",
          competitionProblemId: problemId,
        }),
      }),
    onSuccess: (payload) => {
      setLastResults((current) => ({
        ...current,
        [payload.submission.competition_problem_id]: payload.results,
      }));
      toast.success(
        language === "ro"
          ? `Submisie evaluată: ${payload.submission.points} puncte.`
          : `Submission evaluated: ${payload.submission.points} points.`
      );
      void queryClient.invalidateQueries({ queryKey: submissionsKey });
      void queryClient.invalidateQueries({
        queryKey: ["competitions", "leaderboard", id],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedProblem = useMemo(
    () => competition?.problems.find((problem) => problem.id === selectedProblemId) || null,
    [competition?.problems, selectedProblemId]
  );
  const canSubmitSelectedProblem = Boolean(
    selectedProblem &&
      activeTab === "arena" &&
      competition?.isParticipant &&
      competition.phase === "live" &&
      !submitMutation.isPending
  );
  const submitSolution = submitMutation.mutate;
  const submitSelectedProblem = useCallback(() => {
    if (!selectedProblem || !canSubmitSelectedProblem) return;
    submitSolution(selectedProblem.id);
  }, [canSubmitSelectedProblem, selectedProblem, submitSolution]);

  useEffect(() => {
    function handleSubmitShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      if (!canSubmitSelectedProblem) return;

      event.preventDefault();
      submitSelectedProblem();
    }

    window.addEventListener("keydown", handleSubmitShortcut);
    return () => window.removeEventListener("keydown", handleSubmitShortcut);
  }, [canSubmitSelectedProblem, submitSelectedProblem]);

  const remaining = competition
    ? formatCompetitionDuration(getRemainingMilliseconds(competition.ends_at, now))
    : "00:00:00";
  const elapsedPercent = competition
    ? Math.min(
        100,
        Math.max(
          0,
          ((now.getTime() - Date.parse(competition.starts_at)) /
            (Date.parse(competition.ends_at) - Date.parse(competition.starts_at))) *
            100
        )
      )
    : 0;
  const problemMap = new Map(
    (competition?.problems || []).map((problem) => [problem.id, problem])
  );

  if (detailQuery.isPending) {
    return <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-[500px] rounded-2xl" /></div>;
  }
  if (detailQuery.isError || !competition) {
    return <Card><CardContent className="p-10 text-center text-sm text-red-600">{copy.loadFailed}</CardContent></Card>;
  }

  if (competition.access === "invite_required") {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center">
        <Card className="w-full">
          <CardContent className="space-y-5 p-7 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-zinc-100"><LockKeyhole className="size-5" /></div>
            <div>
              <h1 className="text-2xl font-semibold">{competition.name}</h1>
              <p className="mt-2 text-sm text-zinc-500">{copy.privateDescription}</p>
            </div>
            <Input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder={copy.inviteCode} />
            <Button className="w-full" onClick={() => joinMutation.mutate()} disabled={!inviteCode.trim() || joinMutation.isPending}>
              {joinMutation.isPending ? copy.checking : copy.accept}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto p-3 md:p-4 xl:overflow-hidden">
      <header className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white text-zinc-950 hover:bg-white">{competition.phase.toUpperCase()}</Badge>
              {competition.visibility === "private" && <Badge variant="outline" className="border-zinc-700 text-zinc-300">Private</Badge>}
              {competition.isParticipant && <Badge variant="outline" className="border-zinc-700 text-zinc-300">Participant</Badge>}
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight">{competition.name}</h1>
            </div>
            {competition.description && (
              <p className="mt-1 truncate text-xs text-zinc-400">{competition.description}</p>
            )}
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 lg:min-w-[310px]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-400"><span className="flex items-center gap-1.5"><AlarmClock className="size-3.5" />{copy.timeRemaining}</span><span>{competition.maximumPoints} {copy.pointsMax}</span></div>
              <Progress value={elapsedPercent} className="mt-2 h-1 bg-zinc-700 [&_[data-slot=progress-indicator]]:bg-white" />
            </div>
            <p className="shrink-0 font-mono text-xl font-semibold tabular-nums tracking-tight">{competition.phase === "upcoming" ? formatCompetitionDuration(Math.max(0, Date.parse(competition.starts_at) - now.getTime())) : remaining}</p>
          </div>
        </div>
      </header>

      {competition.phase === "break" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <PauseCircle className="mt-0.5 size-5 shrink-0" />
          <div><p className="text-sm font-semibold">{copy.breakTitle}</p><p className="mt-1 text-xs">{copy.breakDescription}</p></div>
        </div>
      )}

      {!competition.isParticipant && competition.phase !== "finished" && (
        <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{copy.joinTitle}</p><p className="mt-1 text-sm text-zinc-500">{copy.joinDescription}</p></div><Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>{joinMutation.isPending ? copy.joining : copy.join}</Button></CardContent></Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 gap-3">
        <TabsList className="grid h-9 w-full shrink-0 grid-cols-4">
          <TabsTrigger value="arena"><Code2 className="size-4" />Arena</TabsTrigger>
          <TabsTrigger value="overview"><Clock3 className="size-4" />Info</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="size-4" />{copy.ranking}</TabsTrigger>
          <TabsTrigger value="submissions"><Send className="size-4" />{copy.submissions}</TabsTrigger>
        </TabsList>

        <TabsContent value="arena" className="mt-0 min-h-[960px] overflow-hidden p-1 xl:min-h-0">
          {competition.problems.length === 0 ? (
            <Card className="h-full"><CardContent className="flex h-full items-center justify-center p-10 text-center text-sm text-zinc-500">{copy.hiddenProblems}</CardContent></Card>
          ) : (
            <ResizablePanelGroup
              orientation={isNarrowArena ? "vertical" : "horizontal"}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <ResizablePanel
                id="competition-problems"
                defaultSize="18%"
                minSize={isNarrowArena ? "150px" : "180px"}
                maxSize={isNarrowArena ? "28%" : "28%"}
              >
                <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
                  <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{copy.problems}</p>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{competition.problems.length}</Badge>
                  </div>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1.5 p-2">
                      {competition.problems.map((problem, index) => {
                        const attempts = (submissionsQuery.data?.submissions || []).filter((submission) => submission.competition_problem_id === problem.id);
                        const best = Math.max(0, ...attempts.map((submission) => submission.points));
                        const isSelected = selectedProblemId === problem.id;
                        return (
                          <button
                            key={problem.id}
                            type="button"
                            onClick={() => {
                              setSelectedProblemId(problem.id);
                              setCodeByProblem((current) => ({
                                ...current,
                                [problem.id]: current[problem.id] ?? problem.problem.starter_code,
                              }));
                            }}
                            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                              isSelected
                                ? "border-zinc-950 bg-zinc-950 text-white"
                                : "border-transparent bg-white hover:border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold">{copy.problem} {index + 1}</span>
                              <span className="text-[11px] tabular-nums">{problem.max_points}p</span>
                            </div>
                            <p className={`mt-1 truncate text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                              {getLocalized(problem.problem.title_i18n, locale)}
                            </p>
                            {attempts.length > 0 && (
                              <p className={`mt-1.5 text-[10px] font-medium ${isSelected ? "text-zinc-300" : "text-emerald-700"}`}>
                                Best: {best}/{problem.max_points}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="competition-editor"
                defaultSize="54%"
                minSize={isNarrowArena ? "360px" : "420px"}
              >
                <div className="flex h-full min-h-0 flex-col bg-white">
                  <div className="flex h-11 shrink-0 items-center justify-between border-b bg-zinc-50 px-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <Code2 className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate text-xs font-semibold">solution.msp</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">MiniScript+</span>
                  </div>
                  <CodeEditorContextMenu
                    code={selectedProblem ? codeByProblem[selectedProblem.id] ?? selectedProblem.problem.starter_code : ""}
                    disabled={!selectedProblem}
                    fileName="solution.msp"
                    onChange={(value) => selectedProblem && setCodeByProblem((current) => ({ ...current, [selectedProblem.id]: value }))}
                    onSubmit={submitSelectedProblem}
                    submitDisabled={!canSubmitSelectedProblem}
                    submitShortcut="⌘/Ctrl ↵"
                  >
                    <div className="min-h-0 flex-1">
                      <MiniScriptMonacoEditor
                        height="100%"
                        value={selectedProblem ? codeByProblem[selectedProblem.id] ?? selectedProblem.problem.starter_code : ""}
                        onChange={(value) => selectedProblem && setCodeByProblem((current) => ({ ...current, [selectedProblem.id]: value }))}
                        options={{ automaticLayout: true, contextmenu: false, padding: { top: 16, bottom: 16 }, wordWrap: "on" }}
                      />
                    </div>
                  </CodeEditorContextMenu>
                  <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t bg-zinc-50/70 px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex gap-1">
                        {selectedProblem && (lastResults[selectedProblem.id] || []).map((result, index) => (
                          <span key={index} title={`Test ${index + 1}`} className={`size-2 rounded-full ${result.passed ? "bg-emerald-500" : "bg-red-500"}`} />
                        ))}
                      </div>
                      {selectedProblem && (
                        <span className="truncate text-[11px] text-zinc-500">
                          {getLocalized(selectedProblem.problem.title_i18n, locale)}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 gap-2"
                      disabled={!canSubmitSelectedProblem}
                      onClick={submitSelectedProblem}
                    >
                      {submitMutation.isPending ? <Clock3 className="size-4 animate-spin" /> : <Play className="size-4" />}
                      {competition.phase === "break" ? copy.paused : copy.submit}
                      <Kbd className="ml-1 hidden bg-white/15 text-[10px] text-white sm:inline-flex">⌘/Ctrl ↵</Kbd>
                    </Button>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="competition-prompt"
                defaultSize="28%"
                minSize={isNarrowArena ? "260px" : "280px"}
              >
                <div className="flex h-full min-h-0 flex-col bg-white">
                  <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b bg-zinc-50 px-4 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{copy.prompt}</p>
                      <h2 className="truncate text-sm font-semibold">
                        {selectedProblem ? getLocalized(selectedProblem.problem.title_i18n, locale) : "—"}
                      </h2>
                    </div>
                    {selectedProblem && <Badge variant="secondary" className="shrink-0">{selectedProblem.max_points} {copy.points}</Badge>}
                  </div>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="p-5">
                      {selectedProblem && (
                        <div className="text-sm leading-6 text-zinc-700">
                          <Markdown>{getLocalized(selectedProblem.problem.description_i18n, locale)}</Markdown>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-0 min-h-0 overflow-y-auto p-1 pb-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[{ icon: Users, label: copy.participants, value: competition.participantCount }, { icon: Medal, label: copy.maximumScore, value: competition.maximumPoints }, { icon: Code2, label: copy.problems, value: competition.problemCount }].map((item) => <Card key={item.label}><CardContent className="p-5"><item.icon className="size-5 text-zinc-500" /><p className="mt-4 text-2xl font-semibold">{item.value}</p><p className="mt-1 text-sm text-zinc-500">{item.label}</p></CardContent></Card>)}
          </div>
          <Card className="mt-4"><CardContent className="space-y-4 p-5"><h2 className="font-semibold">{copy.schedule}</h2><div className="grid gap-3 text-sm md:grid-cols-2"><div className="rounded-xl bg-zinc-50 p-4"><p className="text-xs text-zinc-500">{copy.starts}</p><p className="mt-1 font-medium">{new Date(competition.starts_at).toLocaleString(ro ? "ro-RO" : "en-US")}</p></div><div className="rounded-xl bg-zinc-50 p-4"><p className="text-xs text-zinc-500">{copy.ends}</p><p className="mt-1 font-medium">{new Date(competition.ends_at).toLocaleString(ro ? "ro-RO" : "en-US")}</p></div></div>{competition.breaks.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">{copy.breaks}</p>{competition.breaks.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"><span>{item.title}</span><span className="text-zinc-500">{new Date(item.starts_at).toLocaleTimeString(ro ? "ro-RO" : "en-US", { hour: "2-digit", minute: "2-digit" })}–{new Date(item.ends_at).toLocaleTimeString(ro ? "ro-RO" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-0 min-h-0 overflow-y-auto p-1 pb-4">
          <Card className="my-1 gap-0 py-0">
            <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{copy.leaderboardTitle}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{copy.leaderboardDescription}</p>
                </div>
              </div>
              {!leaderboardQuery.isPending && !leaderboardQuery.isError && (
                <Badge variant="secondary" className="w-fit shrink-0">
                  {(leaderboardQuery.data?.leaderboard || []).length} {copy.participants.toLowerCase()}
                </Badge>
              )}
            </div>

            <CardContent className="p-3 sm:p-4">
              {leaderboardQuery.isPending ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : leaderboardQuery.isError ? (
                <div className="py-10 text-center text-sm text-zinc-500">{copy.leaderboardHidden}</div>
              ) : (leaderboardQuery.data?.leaderboard || []).length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Trophy className="size-5" />
                  </div>
                  <p className="mt-3 text-sm text-zinc-500">{copy.leaderboardEmpty}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(leaderboardQuery.data?.leaderboard || []).map((entry) => {
                    const podium = entry.position <= 3;
                    const rankLabel = entry.position === 1
                      ? copy.gold
                      : entry.position === 2
                        ? copy.silver
                        : copy.bronze;
                    const rowStyle = entry.position === 1
                      ? "border-amber-200 bg-amber-50/70"
                      : entry.position === 2
                        ? "border-zinc-300 bg-zinc-100/80"
                        : entry.position === 3
                          ? "border-orange-200 bg-orange-50/70"
                          : "border-zinc-100 bg-white hover:bg-zinc-50";
                    const rankStyle = entry.position === 1
                      ? "bg-amber-400 text-amber-950 ring-amber-500/20"
                      : entry.position === 2
                        ? "bg-zinc-300 text-zinc-800 ring-zinc-400/20"
                        : entry.position === 3
                          ? "bg-orange-300 text-orange-950 ring-orange-400/20"
                          : "bg-zinc-100 text-zinc-600 ring-zinc-200";
                    const avatarStyle = entry.position === 1
                      ? "ring-2 ring-amber-400 ring-offset-2"
                      : entry.position === 2
                        ? "ring-2 ring-zinc-300 ring-offset-2"
                        : entry.position === 3
                          ? "ring-2 ring-orange-300 ring-offset-2"
                          : "";

                    return (
                      <div
                        key={entry.user_id}
                        className={`grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3 transition-colors sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:px-4 ${rowStyle}`}
                      >
                        <div className={`flex size-9 items-center justify-center rounded-full text-xs font-bold tabular-nums ring-4 ${rankStyle}`}>
                          {podium ? (
                            <span className="relative flex items-center justify-center">
                              {entry.position === 1 ? <Crown className="size-4" /> : <Medal className="size-4" />}
                              <span className="sr-only">{rankLabel}</span>
                            </span>
                          ) : `#${entry.position}`}
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            avatarUrl={entry.avatar_url}
                            username={entry.username}
                            className={`size-9 sm:size-10 ${avatarStyle}`}
                          />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold">{entry.username}</p>
                              {podium && (
                                <span className="hidden rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 sm:inline-flex">
                                  {rankLabel}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-500">{entry.solved_count} {copy.solved}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold tabular-nums sm:text-base">{entry.total_points}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{copy.points}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-0 min-h-0 overflow-y-auto p-1 pb-4">
          <Card><CardContent className="p-5"><div className="mb-5"><h2 className="font-semibold">{copy.mySubmissions}</h2><p className="mt-1 text-sm text-zinc-500">{copy.submissionDescription}</p></div>{submissionsQuery.isPending ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : <SubmissionHistory locale={locale} items={(submissionsQuery.data?.submissions || []).map((submission) => { const problem = problemMap.get(submission.competition_problem_id); return { code: submission.code, id: submission.id, label: problem ? getLocalized(problem.problem.title_i18n, locale) : copy.problem, maximumPoints: problem?.max_points, points: submission.points, score: submission.score, submittedAt: submission.submitted_at }; })} />}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CompetitionDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <RouteGuard requireAuth><CompetitionDetailContent /></RouteGuard>
    </Suspense>
  );
}
