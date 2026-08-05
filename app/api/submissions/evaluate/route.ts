import { NextResponse } from "next/server";

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
    const problemId = stringField(body.problemId, { min: 1, max: 100 });
    const code = stringField(body.code, {
      min: 1,
      max: 20_000,
      trim: false,
    });

    const admin = createAdminSupabase();
    const { data: problem, error: problemError } = await admin
      .from("problems")
      .select("id, test_cases")
      .eq("id", problemId)
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

    const { data: submission, error: submissionError } = await admin
      .from("submissions")
      .insert({
        user_id: user.id,
        problem_id: problem.id,
        code,
        score: evaluation.score,
        verified_at: new Date().toISOString(),
        verification_source: "server-v1",
      })
      .select("id")
      .single<{ id: string }>();

    if (submissionError) throw submissionError;

    let completionId: string | null = null;
    let bonusPoints = 0;
    let bonusAwarded = false;

    if (evaluation.score === 100) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: challenge, error: challengeError } = await admin
        .from("daily_challenges")
        .select("id, bonus_points")
        .eq("problem_id", problem.id)
        .eq("challenge_date", today)
        .eq("is_active", true)
        .maybeSingle<{ id: string; bonus_points: number | null }>();

      if (challengeError) throw challengeError;

      if (challenge) {
        bonusPoints = Math.max(0, Number(challenge.bonus_points) || 0);
        const { data: completion, error: completionError } = await admin
          .from("daily_challenge_completions")
          .insert({
            challenge_id: challenge.id,
            user_id: user.id,
            problem_id: problem.id,
            bonus_points: bonusPoints,
          })
          .select("id")
          .single<{ id: string }>();

        if (completionError?.code === "23505") {
          completionId = null;
        } else if (completionError) {
          throw completionError;
        } else {
          completionId = completion.id;
          bonusAwarded = true;
        }
      }
    }

    const userClient = createAuthenticatedServerSupabase(accessToken);
    const { data: reward, error: rewardError } = await userClient.rpc(
      "award_submission_reward",
      {
        p_submission_id: submission.id,
        p_completion_id: completionId,
      }
    );

    if (rewardError) {
      console.error("Could not award verified submission:", rewardError);
      throw new HttpError(500, "Submission was evaluated but could not be rewarded");
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
      bonusAwarded,
      bonusPoints: bonusAwarded ? bonusPoints : 0,
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
