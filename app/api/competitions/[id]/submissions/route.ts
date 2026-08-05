import { NextResponse } from "next/server";

import { calculateCompetitionPoints, getCompetitionPhase } from "@/lib/competitions";
import type { CompetitionBreak } from "@/lib/competitionTypes";
import {
  competitionId,
  type CompetitionRow,
} from "@/lib/server/competitionService";
import {
  evaluateMiniScript,
  validateTestCases,
} from "@/lib/server/evaluateMiniScript";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type CompetitionProblemRow = {
  id: string;
  problem_id: string;
  max_points: number;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { user, role } = await requireUser(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const requestedUserId = new URL(request.url).searchParams.get("userId");
    const userId = role === "admin" && requestedUserId ? requestedUserId : user.id;
    if (userId !== user.id && role !== "admin") {
      throw new HttpError(403, "Submission history is private");
    }

    const admin = createAdminSupabase();
    if (role !== "admin") {
      const { data: participant, error: participantError } = await admin
        .from("competition_participants")
        .select("status")
        .eq("competition_id", safeId)
        .eq("user_id", user.id)
        .maybeSingle<{ status: string }>();
      if (participantError) throw participantError;
      if (!participant) throw new HttpError(403, "Competition access required");
    }

    const { data, error } = await admin
      .from("competition_submissions")
      .select(
        "id, competition_id, competition_problem_id, user_id, code, score, points, passed_tests, total_tests, submitted_at"
      )
      .eq("competition_id", safeId)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ submissions: data || [] });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not read competition submissions:", error);
    return NextResponse.json({ error: "Could not read submissions" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireUser(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    await enforceRateLimit({
      action: "competition_submission",
      key: `${user.id}:${safeId}`,
      limit: 20,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 32_000));
    const competitionProblemId = stringField(body.competitionProblemId, {
      min: 1,
      max: 100,
    });
    const code = stringField(body.code, { min: 1, max: 20_000, trim: false });
    const admin = createAdminSupabase();

    const [competitionResult, participantResult, breaksResult, linkResult] =
      await Promise.all([
        admin
          .from("competitions")
          .select("*")
          .eq("id", safeId)
          .maybeSingle<CompetitionRow>(),
        admin
          .from("competition_participants")
          .select("status")
          .eq("competition_id", safeId)
          .eq("user_id", user.id)
          .maybeSingle<{ status: string }>(),
        admin
          .from("competition_breaks")
          .select("id, title, starts_at, ends_at")
          .eq("competition_id", safeId)
          .returns<CompetitionBreak[]>(),
        admin
          .from("competition_problems")
          .select("id, problem_id, max_points")
          .eq("competition_id", safeId)
          .eq("id", competitionProblemId)
          .maybeSingle<CompetitionProblemRow>(),
      ]);
    if (competitionResult.error) throw competitionResult.error;
    if (participantResult.error) throw participantResult.error;
    if (breaksResult.error) throw breaksResult.error;
    if (linkResult.error) throw linkResult.error;
    const competition = competitionResult.data;
    const link = linkResult.data;
    if (!competition || !link) throw new HttpError(404, "Competition problem not found");
    if (participantResult.data?.status !== "active") {
      throw new HttpError(403, "You are not an active participant");
    }

    const phase = getCompetitionPhase(competition, breaksResult.data || []);
    if (phase === "break") throw new HttpError(409, "Submissions are paused during the break");
    if (phase !== "live") throw new HttpError(409, "Competition is not accepting submissions");

    const { data: problem, error: problemError } = await admin
      .from("problems")
      .select("id, test_cases")
      .eq("id", link.problem_id)
      .maybeSingle<{ id: string; test_cases: unknown }>();
    if (problemError) throw problemError;
    if (!problem) throw new HttpError(404, "Problem not found");

    let evaluation;
    try {
      evaluation = evaluateMiniScript(code, validateTestCases(problem.test_cases));
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Could not evaluate submission"
      );
    }
    const passedTests = evaluation.results.filter((result) => result.passed).length;
    const points = calculateCompetitionPoints(evaluation.score, link.max_points);
    const resultSummary = evaluation.results.map((result) => ({
      passed: result.passed,
    }));

    const { data: submission, error: submissionError } = await admin
      .from("competition_submissions")
      .insert({
        code,
        competition_id: safeId,
        competition_problem_id: link.id,
        passed_tests: passedTests,
        points,
        result_summary: resultSummary,
        score: evaluation.score,
        total_tests: evaluation.results.length,
        user_id: user.id,
        verification_source: "competition-server-v1",
      })
      .select(
        "id, competition_id, competition_problem_id, user_id, code, score, points, passed_tests, total_tests, submitted_at"
      )
      .single();
    if (submissionError) throw submissionError;

    return NextResponse.json({
      submission,
      results: resultSummary,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Competition submission failed:", error);
    return NextResponse.json({ error: "Could not evaluate submission" }, { status: 500 });
  }
}
