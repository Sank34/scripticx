"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
function formatDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function parseDateKey(value: string) { return new Date(value + "T12:00:00"); }
export function DailyChallengeScheduler() {
  const { user, can } = useAuth();
  const canManageDaily = can("admin.daily");
  const { locale } = useLanguage(); const ro = locale === "ro"; const queryClient = useQueryClient();
  const todayKey = formatDateKey(new Date());
  const [schedulingDaily, setSchedulingDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState(todayKey);
  const [dailyProblemId, setDailyProblemId] = useState("");
  const [dailyBonusPoints, setDailyBonusPoints] = useState(25);
  const adminProblemsQueryKey = ["admin", "daily", user?.id, canManageDaily];
  const query = useQuery({ queryKey: adminProblemsQueryKey, enabled: canManageDaily, queryFn: async () => {
    const [{ data, error }, dailyChallenges] = await Promise.all([supabase.from("problems").select("id,code,title_i18n").order("code"), api.dailyChallenges.list(90)]);
    if (error) throw error; return { problems: data ?? [], dailyChallenges };
  } });
  const problems = query.data?.problems ?? []; const dailyChallenges = query.data?.dailyChallenges ?? [];
  const scheduledDateKeys = new Set(dailyChallenges.filter(c => c.is_active).map(c => c.challenge_date));
  const copy = ro ? { daily: "Provocări zilnice", dailyDescription: "Alege problema și data publicării.", chooseProblem: "Alege problema", bonus: "Puncte bonus", scheduling: "Se salvează…", schedule: "Programează", scheduled: "Programate", active: "Activă", inactive: "Inactivă", selectFirst: "Alege o problemă.", futureOnly: "Alege data de astăzi sau o dată viitoare.", scheduleSuccess: "Provocare programată", scheduleError: "Provocarea nu a putut fi programată." } : { daily: "Daily challenges", dailyDescription: "Choose a problem and its publication date.", chooseProblem: "Choose a problem", bonus: "Bonus points", scheduling: "Saving…", schedule: "Schedule", scheduled: "Scheduled", active: "Active", inactive: "Inactive", selectFirst: "Choose a problem.", futureOnly: "Choose today or a future date.", scheduleSuccess: "Challenge scheduled", scheduleError: "Could not schedule challenge." };
  async function handleScheduleDailyChallenge() {
    if (!canManageDaily) return;
    if (!dailyProblemId) {
      toast.error(copy.selectFirst);
      return;
    }
    if (dailyDate < todayKey) {
      setDailyDate(todayKey);
      toast.error(copy.futureOnly);
      return;
    }
    setSchedulingDaily(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Missing user");
      await api.dailyChallenges.schedule({
        date: dailyDate,
        problemId: dailyProblemId,
        bonusPoints: dailyBonusPoints,
        createdBy: user.id,
      });
      await queryClient.invalidateQueries({ queryKey: adminProblemsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["daily-challenge"] });
      toast.success(copy.scheduleSuccess);
    } catch {
      toast.error(copy.scheduleError);
    } finally {
      setSchedulingDaily(false);
    }
  }

  if (!canManageDaily) return null;
  if (query.isPending) return <p className="text-sm text-muted-foreground">{ro ? "Se încarcă provocările…" : "Loading challenges…"}</p>;
  if (query.isError) return <div role="alert">{query.error.message}<Button variant="outline" onClick={() => query.refetch()}>{ro ? "Reîncearcă" : "Retry"}</Button></div>;
  return (      <section className="sx-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">{copy.daily}</h2>
              <Badge variant="outline">{dailyChallenges.length}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{copy.dailyDescription}</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-[190px_minmax(260px,1fr)_150px_auto]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal">
                <CalendarDays className="text-muted-foreground" />
                {parseDateKey(dailyDate).toLocaleDateString(ro ? "ro-RO" : "en-US")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parseDateKey(dailyDate)}
                modifiers={{ scheduled: (date) => scheduledDateKeys.has(formatDateKey(date)) }}
                modifiersClassNames={{ scheduled: "bg-[var(--sx-success-soft)] font-semibold text-foreground" }}
                disabled={(date) => formatDateKey(date) < todayKey}
                onSelect={(date) => {
                  if (!date) return;
                  const dateKey = formatDateKey(date);
                  if (dateKey >= todayKey) setDailyDate(dateKey);
                }}
              />
            </PopoverContent>
          </Popover>
          <Select value={dailyProblemId} onValueChange={setDailyProblemId}>
            <SelectTrigger className="w-full" aria-label={copy.chooseProblem}><SelectValue placeholder={copy.chooseProblem} /></SelectTrigger>
            <SelectContent>
              {problems.map((problem) => (
                <SelectItem key={problem.id} value={problem.id}>
                  {problem.code != null ? `#${problem.code} ` : ""}{getLocalized(problem.title_i18n, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="relative">
            <span className="sr-only">{copy.bonus}</span>
            <Input
              className="pr-10"
              min={0}
              type="number"
              value={dailyBonusPoints}
              onChange={(event) => setDailyBonusPoints(Number(event.target.value))}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">pts</span>
          </label>
          <Button onClick={() => void handleScheduleDailyChallenge()} disabled={schedulingDaily}>
            {schedulingDaily ? copy.scheduling : copy.schedule}
          </Button>
        </div>
        {dailyChallenges.length > 0 && (
          <div className="border-t bg-muted/20 px-5 py-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">{copy.scheduled}</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {dailyChallenges.slice(0, 6).map((challenge) => (
                <div key={challenge.id} className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--sx-radius-control)] border bg-background px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getLocalized(challenge.problems?.title_i18n, locale)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{challenge.challenge_date} · +{challenge.bonus_points || 0} pts</p>
                  </div>
                  <Badge variant={challenge.is_active ? "secondary" : "outline"}>{challenge.is_active ? copy.active : copy.inactive}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>);
}
