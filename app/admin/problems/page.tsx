"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useRouter } from "next/navigation";
import { getLocalized } from "@/lib/getLocalized";
import { markdownPreview } from "@/lib/markdownPreview";
import { useLanguage } from "@/components/LanguageProvider";
import { api, type DailyChallenge } from "@/lib/api";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ProblemForm } from "@/components/admin/ProblemForm";

import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function AdminProblemsContent() {
  const router = useRouter();
  const { locale, t } = useLanguage();

  const [problems, setProblems] = useState<any[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingDaily, setSchedulingDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState(() =>
    api.dailyChallenges.getTodayKey()
  );
  const [dailyProblemId, setDailyProblemId] = useState("");
  const [dailyBonusPoints, setDailyBonusPoints] = useState(25);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    async function fetchProblems() {
      const [{ data }, scheduled] = await Promise.all([
        supabase
          .from("problems")
          .select("*")
          .order("created_at", { ascending: false }),
        api.dailyChallenges.list(10),
      ]);

      setProblems(data || []);
      setDailyChallenges(scheduled);
      setLoading(false);
    }

    fetchProblems();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;

    const { error } = await supabase
      .from("problems")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error(t("admin.problems.toast.deleteError"));
      return;
    }

    setProblems((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);

    toast.success(t("admin.problems.toast.deleted"));
  }

  async function handleScheduleDailyChallenge() {
    if (!dailyProblemId) {
      toast.error("Select a problem first");
      return;
    }

    setSchedulingDaily(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Missing user");

      await api.dailyChallenges.schedule({
        date: dailyDate,
        problemId: dailyProblemId,
        bonusPoints: dailyBonusPoints,
        createdBy: user.id,
      });

      setDailyChallenges(await api.dailyChallenges.list(10));
      toast.success("Daily challenge scheduled");
    } catch {
      toast.error("Could not schedule daily challenge");
    } finally {
      setSchedulingDaily(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("admin.problems.manageTitle")}</h1>

        <Button onClick={() => setOpenCreate(true)}>
          {t("admin.problems.create")}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-orange-500" />
            <h2 className="text-lg font-semibold">Daily code challenge</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-[190px_minmax(0,1fr)_140px_auto]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start gap-2 font-normal"
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {parseDateKey(dailyDate).toLocaleDateString(
                    locale === "ro" ? "ro-RO" : "en-US"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parseDateKey(dailyDate)}
                  onSelect={(date) => {
                    if (date) setDailyDate(formatDateKey(date));
                  }}
                />
              </PopoverContent>
            </Popover>
            <Select value={dailyProblemId} onValueChange={setDailyProblemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose problem" />
              </SelectTrigger>
              <SelectContent>
                {problems.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.code != null ? `#${problem.code} ` : ""}
                    {getLocalized(problem.title_i18n, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                className="pr-10"
                min={0}
                type="number"
                value={dailyBonusPoints}
                onChange={(event) =>
                  setDailyBonusPoints(Number(event.target.value))
                }
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                pct
              </span>
            </div>
            <Button
              onClick={handleScheduleDailyChallenge}
              disabled={schedulingDaily}
            >
              {schedulingDaily ? "Scheduling..." : "Schedule"}
            </Button>
          </div>

          <div className="max-h-[198px] space-y-2 overflow-y-auto pr-1">
            {dailyChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {challenge.challenge_date} ·{" "}
                    {getLocalized(challenge.problems?.title_i18n, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.bonus_points || 0} bonus points
                  </p>
                </div>
                <Badge variant={challenge.is_active ? "default" : "secondary"}>
                  {challenge.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">

        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}

        {!loading &&
          problems.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex justify-between items-center">

                <div>
                  <h2 className="font-semibold text-lg">
                    {getLocalized(p.title_i18n, locale)}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {markdownPreview(getLocalized(p.description_i18n, locale))}
                  </p>
                </div>

                <div className="flex gap-2">

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/problems/${p.id}`)}
                  >
                    {t("admin.problems.edit")}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setDeleteId(p.id)}
                  >
                    {t("admin.problems.delete")}
                  </Button>

                </div>

              </CardContent>
            </Card>
          ))}

      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.problems.dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.problems.dialog.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.problems.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("admin.problems.dialog.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.problems.dialog.createTitle")}</DialogTitle>
          </DialogHeader>

          <ProblemForm
            onSuccess={() => {
              setOpenCreate(false);
              window.location.reload();
            }}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function AdminProblemsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminProblemsContent />
    </RouteGuard>
  );
}
