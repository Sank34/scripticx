import { NextResponse } from "next/server";

import {
  getAllowedProblemLanguages,
  isProblemSubmissionLanguage,
  type ProblemSubmissionLanguage,
} from "@/lib/problem-submission-language";
import { evaluateCloudSubmission } from "@/lib/server/evaluateCloudSubmission";
import {
  createAdminSupabase,
  createAuthenticatedServerSupabase,
} from "@/lib/supabaseServer";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(request: Request) {
  try {
    const { user, accessToken } = await requireUser(request);
    await enforceRateLimit({
      key: user.id,
      action: "submission_evaluate",
      limit: 20,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 32_000));
    const language = body.language === undefined ? "miniscript" : body.language;
    if (!isProblemSubmissionLanguage(language)) {
      throw new HttpError(400, "Unsupported submission language");
    }
    const problemId = stringField(body.problemId, { min: 1, max: 100 });
    const code = stringField(body.code, {
      min: 1,
      max: 20_000,
      trim: false,
    });

    const admin = createAdminSupabase();
    const { data: problem, error: problemError } = await admin
      .from("problems")
      .select("id, test_cases, visibility, publish_at, allowed_languages")
      .eq("id", problemId)
      .maybeSingle<{
        allowed_languages: ProblemSubmissionLanguage[] | null;
        id: string;
        publish_at: string | null;
        test_cases: unknown;
        visibility: string | null;
      }>();

    if (problemError) throw problemError;
    if (
      !problem ||
      (problem.visibility && problem.visibility !== "public") ||
      (problem.publish_at && Date.parse(problem.publish_at) > Date.now())
    ) {
      throw new HttpError(404, "Problem not found");
    }
    if (!getAllowedProblemLanguages(problem.allowed_languages).includes(language)) {
      return NextResponse.json({
        code: "problem_language_not_allowed",
        error: "This language is not allowed for this problem",
      }, { status: 403 });
    }

    let tests;
    try {
      tests = validateTestCases(problem.test_cases);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Could not evaluate submission"
      );
    }

    let evaluation;
    if (language === "miniscript") {
      try {
        evaluation = evaluateMiniScript(code, tests);
      } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : "Could not evaluate submission");
      }
    } else {
      await enforceRateLimit({
        key: user.id,
        action: "submission_cloud_evaluate",
        limit: 5,
        windowSeconds: 60,
      });
      evaluation = await evaluateCloudSubmission(language, code, tests);
    }

    const { data: submission, error: submissionError } = await admin
      .from("submissions")
      .insert({
        user_id: user.id,
        problem_id: problem.id,
        code,
        language,
        score: evaluation.score,
        verified_at: new Date().toISOString(),
        verification_source: "server-v1",
      })
      .select("id")
      .single<{ id: string }>();

    if (submissionError) {
      console.error("Could not save evaluated submission:", submissionError);
      throw new HttpError(503, "Your code was evaluated, but the submission could not be saved. Try again.");
    }

    const userClient = createAuthenticatedServerSupabase(accessToken);
    const { data: reward, error: rewardError } = await userClient.rpc(
      "award_submission_reward",
      {
        p_submission_id: submission.id,
      }
    );

    if (rewardError) {
      console.error("Could not award verified submission:", rewardError);
      throw new HttpError(500, "Submission was evaluated but could not be rewarded");
    }

    if (
      !reward ||
      typeof reward.bonus_awarded !== "boolean" ||
      typeof reward.bonus_points !== "number"
    ) {
      console.error("Submission reward RPC returned an unsupported response");
      throw new HttpError(503, "Submission was evaluated but rewards are temporarily unavailable");
    }

    const { error: achievementError } = await userClient.rpc(
      "unlock_automatic_achievements"
    );
    if (achievementError) {
      console.warn("Could not unlock automatic achievements:", achievementError);
    }

    return NextResponse.json({
      submissionId: submission.id,
      score: evaluation.score,
      results: evaluation.results,
      bonusAwarded: reward.bonus_awarded,
      bonusPoints: reward.bonus_points,
      dailyCompleted: reward.daily_completed === true,
      reward,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Submission evaluation failed:", error);
    return NextResponse.json(
      { error: "Could not evaluate submission" },
      { status: 500 }
    );
  }
}
