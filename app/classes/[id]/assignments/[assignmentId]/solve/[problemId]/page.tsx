"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/Markdown";
import { useLanguage } from "@/components/LanguageProvider";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type SolvePageData = {
  assignment: any;
  problem: any;
  submission: any;
};

export default function SolvePage() {
  const params = useParams();
  const { locale, t } = useLanguage();

  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;

  const problemIdParam = Array.isArray(params.problemId)
    ? params.problemId[0]
    : params.problemId;

  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const hydratedRoute = useRef<string | null>(null);
  const userId = user?.id || null;
  const solveQueryKey = [
    "classes",
    "assignment-solve",
    assignmentId,
    problemIdParam,
    userId,
    locale,
  ] as const;

  const { data: solvePage, isPending: loading } = useQuery({
    queryKey: solveQueryKey,
    queryFn: async (): Promise<SolvePageData> => {
      if (!assignmentId || !problemIdParam) {
        return { assignment: null, problem: null, submission: null };
      }
      const [assignmentResult, problemResult, submissionResult] = await Promise.all([
        supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle(),
        supabase.from("problems").select("*").eq("id", problemIdParam).maybeSingle(),
        userId
          ? supabase
              .from("assignment_problem_submissions")
              .select("*")
              .eq("assignment_id", assignmentId)
              .eq("user_id", userId)
              .eq("problem_id", problemIdParam)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (assignmentResult.error) throw assignmentResult.error;
      if (problemResult.error) throw problemResult.error;
      if (submissionResult.error) throw submissionResult.error;

      const problemData = problemResult.data;
      return {
        assignment: assignmentResult.data,
        problem: problemData
          ? {
              ...problemData,
              title: problemData.title_i18n?.[locale] || problemData.title_i18n?.en || "Untitled",
              description:
                problemData.description_i18n?.[locale] || problemData.description_i18n?.en || "",
            }
          : null,
        submission: submissionResult.data,
      };
    },
    enabled: Boolean(assignmentId && problemIdParam) && !authLoading,
    staleTime: 90 * 1000,
  });
  const assignment = solvePage?.assignment || null;
  const problem = solvePage?.problem || null;
  const submitted = Boolean(solvePage?.submission);

  useEffect(() => {
    const routeKey = `${assignmentId}:${problemIdParam}:${userId || "anonymous"}`;
    if (!solvePage || hydratedRoute.current === routeKey) return;
    setCode(solvePage.submission?.code || "");
    hydratedRoute.current = routeKey;
  }, [assignmentId, problemIdParam, solvePage, userId]);

  async function handleSubmit() {
    if (!code.trim() || !userId) return;

    const { error } = await supabase
      .from("assignment_problem_submissions")
      .upsert(
        {
          assignment_id: assignment.id,
          problem_id: problem?.id,
          user_id: userId,
          code,
        },
        {
          onConflict: "assignment_id,problem_id,user_id",
        }
      );

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.setQueryData<SolvePageData>(solveQueryKey, (current) =>
        current
          ? {
              ...current,
              submission: {
                assignment_id: assignment.id,
                problem_id: problem?.id,
                user_id: userId,
                code,
              },
            }
          : current
      );
      void queryClient.invalidateQueries({
        queryKey: ["classes", params.id, "assignments", assignmentId],
      });
    }
  }

  if (loading || !assignment) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t("classes.solve.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

        {/* Problem */}
        <Card className="h-[520px] overflow-hidden">
          <CardHeader className="shrink-0 border-b bg-background">
            <CardTitle>
              {problem?.title || t("classes.solve.problemFallback")}
            </CardTitle>
          </CardHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <Markdown>
              {problem?.description || t("classes.solve.noDescription")}
            </Markdown>
          </div>
        </Card>

        {/* Editor */}
        <Card className="h-[520px] overflow-hidden">
          <CardHeader className="shrink-0 border-b bg-background">
            <CardTitle>{t("classes.solve.yourSolution")}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-6">
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border">
              <MiniScriptMonacoEditor
                key={problem?.id}
                height="100%"
                value={code}
                onChange={(nextCode) => setCode(nextCode)}
                options={{
                  readOnly: submitted,
                  padding: { top: 16, bottom: 16 },
                  smoothScrolling: true,
                  wordWrap: "on",
                  automaticLayout: true,
                  cursorSmoothCaretAnimation: "on",
                  cursorBlinking: "smooth",
                  glyphMargin: true,
                  minimap: { enabled: false },
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                  tabSize: 2,
                  insertSpaces: true,
                  wrappingIndent: "same",
                }}
              />
            </div>

            <div className="shrink-0">
              <Button onClick={handleSubmit} disabled={submitted}>
                {submitted ? t("classes.solve.submitted") : t("classes.solve.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
