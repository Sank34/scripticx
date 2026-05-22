"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SolvePage() {
  const params = useParams();

  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;

  const problemIdParam = Array.isArray(params.problemId)
    ? params.problemId[0]
    : params.problemId;

  const [assignment, setAssignment] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    load();
  }, [assignmentId, problemIdParam]);

  async function load() {
    if (!assignmentId) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) setUserId(user.id);

    setSubmitted(false);
    setCode("");

    // assignment
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    setAssignment(assignmentData);
    if (!assignmentData) return;

    if (!problemIdParam) {
      console.error("Missing problemId in route");
      return;
    }

    const finalProblemId = problemIdParam;

    setProblem(null);

    if (finalProblemId) {
      const { data: problemData } = await supabase
        .from("problems")
        .select("*")
        .eq("id", finalProblemId)
        .single();

      if (problemData) {
        setProblem({
          ...problemData,
          title: problemData.title_i18n?.en || "Untitled",
          description: problemData.description_i18n?.en || "",
        });
      }
    }

    // existing submission (optional)
    if (user && assignmentData) {
      console.log("FETCH SUBMISSION:", {
        assignmentId: assignmentData.id,
        userId: user?.id,
        problemId: finalProblemId,
      });
      const { data: submission } = await supabase
        .from("assignment_problem_submissions")
        .select("*")
        .eq("assignment_id", assignmentData.id)
        .eq("user_id", user.id)
        .eq("problem_id", finalProblemId)
        .maybeSingle();

      if (submission?.code) {
        setCode(submission.code);
        setSubmitted(true);
      }
    }
  }

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
      console.error("SUBMIT ERROR:", error);
    } else {
      console.log("SUBMIT OK", {
        assignmentId: assignment.id,
        problemId: problem?.id,
        userId,
      });
    }

    setSubmitted(true);
  }

  if (!assignment) {
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
          Solve the problem and submit your solution
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Problem */}
        <Card>
          <CardHeader>
            <CardTitle>{problem?.title || "Problem"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
            {problem?.description || "No problem description"}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Your Solution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <textarea
              key={problem?.id}
              className="w-full h-64 p-3 border rounded font-mono text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`PRINT "Hello World"`}
              readOnly={submitted}
            />

            <Button onClick={handleSubmit} disabled={submitted}>
              {submitted ? "Submitted!" : "Submit"}
            </Button>

          </CardContent>
        </Card>

      </div>

    </div>
  );
}