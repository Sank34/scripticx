"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import { translations } from "@/lib/i18n";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";

type AssignmentPageData = {
  assignment: any;
  problems: any[];
  isTeacher: boolean;
  members: any[];
  submissions: any[];
};

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams();

  const classId = Array.isArray(params.id) ? params.id[0] : params.id;
  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;

  const [viewOpen, setViewOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<any>(null);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  const { data: assignmentPage, isPending: loading } = useQuery({
    queryKey: ["classes", classId, "assignments", assignmentId, userId, locale],
    queryFn: async (): Promise<AssignmentPageData> => {
      if (!assignmentId || !classId) {
        return { assignment: null, problems: [], isTeacher: false, members: [], submissions: [] };
      }

      const [assignmentResult, classResult, memberResult, submissionResult] =
        await Promise.all([
          supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle(),
          supabase.from("classes").select("teacher_id").eq("id", classId).maybeSingle(),
          supabase.from("class_members").select("user_id").eq("class_id", classId),
          supabase
            .from("assignment_problem_submissions")
            .select("*")
            .eq("assignment_id", assignmentId),
        ]);
      if (assignmentResult.error) throw assignmentResult.error;
      if (classResult.error) throw classResult.error;
      if (memberResult.error) throw memberResult.error;
      if (submissionResult.error) throw submissionResult.error;

      const assignmentData = assignmentResult.data;
      const memberIds = (memberResult.data || []).map((member) => member.user_id);
      const { data: profiles, error: profileError } = memberIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, equipped_rewards")
            .in("id", memberIds)
        : { data: [], error: null };
      if (profileError) throw profileError;

      let problemIds: unknown = assignmentData?.problem_ids;
      if (typeof problemIds === "string") {
        const serializedProblemIds = problemIds;
        try {
          problemIds = JSON.parse(serializedProblemIds);
        } catch {
          if (serializedProblemIds.startsWith("{") && serializedProblemIds.endsWith("}")) {
            problemIds = serializedProblemIds
              .slice(1, -1)
              .split(",")
              .map((value: string) => value.trim());
          }
        }
      }
      const normalizedProblemIds = Array.isArray(problemIds)
        ? problemIds.filter((value): value is string => typeof value === "string" && Boolean(value))
        : assignmentData?.problem_id
          ? [assignmentData.problem_id]
          : [];
      const { data: problemRows, error: problemError } = normalizedProblemIds.length
        ? await supabase.from("problems").select("*").in("id", normalizedProblemIds)
        : { data: [], error: null };
      if (problemError) throw problemError;

      return {
        assignment: assignmentData,
        problems: (problemRows || []).map((problem) => ({
          ...problem,
          title: problem.title_i18n?.[locale] || problem.title_i18n?.en || "Untitled",
          description:
            problem.description_i18n?.[locale] || problem.description_i18n?.en || "",
        })),
        isTeacher: Boolean(userId && classResult.data?.teacher_id === userId),
        members: profiles || [],
        submissions: submissionResult.data || [],
      };
    },
    enabled: Boolean(assignmentId && classId) && !authLoading,
    staleTime: 90 * 1000,
  });
  const assignment = assignmentPage?.assignment || null;
  const problems = assignmentPage?.problems || [];
  const isTeacher = assignmentPage?.isTeacher || false;
  const members = assignmentPage?.members || [];
  const submissions = assignmentPage?.submissions || [];

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-9 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="p-6">{t("classes.assignment.notFound")}</div>;
  }

  const isPastDeadline =
    assignment?.deadline &&
    new Date(assignment.deadline) < new Date();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{assignment.title}</h1>
          {!isTeacher && (() => {
            const allSolved =
              problems.length > 0 &&
              problems.every((p) =>
                submissions.some((s) => s.problem_id === p.id && s.user_id === userId)
              );

            return (
              <Badge
                variant={
                  allSolved
                    ? isPastDeadline
                      ? "destructive"
                      : "secondary"
                    : "outline"
                }
              >
                {allSolved
                  ? isPastDeadline
                    ? t("classes.assignment.status.submittedLate")
                    : t("classes.assignment.status.submitted")
                  : isPastDeadline
                  ? t("classes.assignment.status.late")
                  : t("classes.assignment.status.inProgress")}
              </Badge>
            );
          })()}
        </div>
        <p className="text-sm text-muted-foreground">
          {assignment.deadline
            ? t("classes.assignment.deadlineLabel") + " " + new Date(assignment.deadline).toLocaleString()
            : t("classes.assignment.noDeadline")}
        </p>
      </div>

      {/* Description */}
      {assignment.description && (
        <Card>
          <CardHeader>
            <CardTitle>{t("classes.assignment.description")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {assignment.description}
          </CardContent>
        </Card>
      )}

      {/* Problems */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t("classes.assignment.problems.title")}</h2>

        {problems.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("classes.assignment.problems.empty")}
          </p>
        )}

        {problems.map((p, i) => (
          <Card key={p.id} className="flex h-[430px] overflow-hidden">
            <CardHeader className="shrink-0 border-b bg-background">
              <CardTitle className="flex items-center gap-2">
                <span>{t("classes.assignment.problems.problemPrefix")} {i + 1}: {p.title}</span>
                {submissions.some((s) => s.problem_id === p.id && s.user_id === userId) && (
                  (() => {
                    const isPastDeadline =
                      assignment?.deadline &&
                      new Date(assignment.deadline) < new Date();

                    return (
                      <span
                        className={`text-xs px-2 py-0.5 rounded text-white ${
                          isPastDeadline ? "bg-red-500" : "bg-green-500"
                        }`}
                      >
                        {isPastDeadline ? t("classes.assignment.status.solvedLate") : t("classes.assignment.status.solved")}
                      </span>
                    );
                  })()
                )}
              </CardTitle>
            </CardHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <Markdown>{p.description || t("classes.assignment.problems.empty")}</Markdown>
            </div>

            {!isTeacher && (() => {
              const isSolved = submissions.some(
                (s) => s.problem_id === p.id && s.user_id === userId
              );

              return (
                <div className="shrink-0 border-t bg-background p-4">
                  <Button
                    disabled={isSolved}
                    variant={isSolved ? "secondary" : "default"}
                    onClick={() =>
                      router.push(`/classes/${classId}/assignments/${assignmentId}/solve/${p.id}`)
                    }
                  >
                    {isSolved ? t("classes.assignment.status.solved") : t("classes.assignment.problems.solve")}
                  </Button>
                </div>
              );
            })()}
          </Card>
        ))}
      </div>

    {/* Teacher submissions UI */}
    {isTeacher && (
      <Card>
        <CardHeader>
          <CardTitle>{t("classes.assignment.submissions.title")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {members.map((m) => {
            const userSubs = submissions.filter((s) => s.user_id === m.id);

            const allSolved =
              problems.length > 0 &&
              problems.every((p) => userSubs.some((s) => s.problem_id === p.id));

            // consider late if ANY of the submissions for this user is after deadline
            const isLate =
              assignment?.deadline &&
              userSubs.some((s) => new Date(s.created_at) > new Date(assignment.deadline));

            // keep a representative submission for opening modal (first one)
            const sub = userSubs[0];

            return (
              <div
                key={m.id}
                className="flex items-center justify-between border rounded p-2"
              >
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={m.avatar_url}
                    username={m.username}
                    equippedRewards={m.equipped_rewards}
                    className="w-6 h-6"
                  />

                  <span className="text-sm font-medium">{m.username}</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.id !== userId && (
                    <span
                      className={`text-xs ${
                        allSolved
                          ? isLate
                            ? "text-red-500"
                            : "text-green-600 dark:text-green-400"
                          : userSubs.length > 0
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {allSolved
                        ? isLate
                          ? t("classes.assignment.status.submittedLate")
                          : t("classes.assignment.status.submitted")
                        : userSubs.length > 0
                        ? t("classes.assignment.status.inProgress")
                        : t("classes.assignment.status.notSubmitted")}
                    </span>
                  )}

                  {allSolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveSubmission(sub);
                        setActiveProblemIndex(0);
                        setViewOpen(true);
                      }}
                    >
                      {t("classes.assignment.submissions.view")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    )}

    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("classes.assignment.submissions.dialogTitle")}</DialogTitle>
        </DialogHeader>

        {/* Problems selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActiveProblemIndex(i)}
              className={`px-3 py-1.5 text-sm rounded border whitespace-nowrap ${
                activeProblemIndex === i ? "bg-primary text-white" : "bg-muted"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Code viewer */}
        <div className="border rounded-lg p-4 h-80 overflow-auto bg-muted/40 font-mono text-sm whitespace-pre-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {submissions.find(
            (s) =>
              s.user_id === activeSubmission?.user_id &&
              s.problem_id === problems[activeProblemIndex]?.id
          )?.code || t("classes.assignment.submissions.noCode")}
        </div>
      </DialogContent>
    </Dialog>

    </div>
  );
}
