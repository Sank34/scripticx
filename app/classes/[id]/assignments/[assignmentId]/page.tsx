"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams();

  const classId = Array.isArray(params.id) ? params.id[0] : params.id;
  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;

  const [assignment, setAssignment] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // removed submitted state (derived from problems)
  const [isTeacher, setIsTeacher] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [assignmentId]);

  async function load() {
    if (!assignmentId) return;

    // 1. Assignment
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    console.log("ASSIGNMENT DATA:", assignmentData);

    setAssignment(assignmentData);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) setUserId(user.id);

    // detect teacher from class
    const { data: classData } = await supabase
      .from("classes")
      .select("teacher_id")
      .eq("id", classId)
      .single();

    if (user && classData?.teacher_id === user.id) {
      setIsTeacher(true);
    }

    // removed old assignment_submissions logic

    // fetch members
    const { data: memberRows } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId);

    const userIds = memberRows?.map((m: any) => m.user_id) || [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    // fetch submissions (per problem)
    const { data: subs } = await supabase
      .from("assignment_problem_submissions")
      .select("*")
      .eq("assignment_id", assignmentId);

    setMembers(profiles || []);
    setSubmissions(subs || []);

    // 2. Problems (support multiple)
    let problemIds = assignmentData?.problem_ids;
    // handle stringified arrays and Postgres array format
    if (typeof problemIds === "string") {
      try {
        // try JSON first
        problemIds = JSON.parse(problemIds);
      } catch {
        // fallback for Postgres array format: "{uuid1,uuid2}"
        if (problemIds.startsWith("{") && problemIds.endsWith("}")) {
          problemIds = problemIds
            .slice(1, -1)
            .split(",")
            .map((id: string) => id.trim())
            .filter(Boolean);
        }
      }
    }

    console.log("PARSED problemIds:", problemIds, typeof problemIds);

    if (problemIds && problemIds.length) {
      const { data: problemsData } = await supabase
        .from("problems")
        .select("*")
        .in("id", problemIds);

      console.log("PROBLEMS DATA:", problemsData);

      if (problemsData) {
        setProblems(
          problemsData.map((p: any) => ({
            ...p,
            title: p.title_i18n?.en || "Untitled",
            description: p.description_i18n?.en || "",
          }))
        );
      }
    } else if (assignmentData?.problem_id) {
      // fallback old single problem
      const { data: problemData } = await supabase
        .from("problems")
        .select("*")
        .eq("id", assignmentData.problem_id)
        .single();

      if (problemData) {
        setProblems([
          {
            ...problemData,
            title: problemData.title_i18n?.en || "Untitled",
            description: problemData.description_i18n?.en || "",
          },
        ]);
      }
    }

    setLoading(false);
  }

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
          <Card key={p.id}>
            <CardHeader>
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

            <CardContent className="space-y-4">

              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {p.description}
              </p>

              {!isTeacher && (() => {
                const isSolved = submissions.some(
                  (s) => s.problem_id === p.id && s.user_id === userId
                );

                return (
                  <Button
                    disabled={isSolved}
                    variant={isSolved ? "secondary" : "default"}
                    onClick={() =>
                      router.push(`/classes/${classId}/assignments/${assignmentId}/solve/${p.id}`)
                    }
                  >
                    {isSolved ? t("classes.assignment.status.solved") : t("classes.assignment.problems.solve")}
                  </Button>
                );
              })()}

            </CardContent>
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
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      {m.username?.[0]}
                    </div>
                  )}

                  <span className="text-sm font-medium">{m.username}</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.id !== userId && (
                    <span
                      className={`text-xs ${
                        allSolved
                          ? isLate
                            ? "text-red-500"
                            : "text-green-600"
                          : userSubs.length > 0
                          ? "text-yellow-600"
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
