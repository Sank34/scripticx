import { NextResponse } from "next/server";

import { competitionId, type CompetitionRow } from "@/lib/server/competitionService";
import { validateTestCases } from "@/lib/server/evaluateMiniScript";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function localizedText(value: unknown, max: number) {
  const source = jsonObject(value);
  const result: Record<string, string> = {};
  Object.entries(source).forEach(([locale, text]) => {
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) || typeof text !== "string") return;
    const normalized = text.trim();
    if (normalized && normalized.length <= max) result[locale] = normalized;
  });
  if (!Object.keys(result).length) throw new HttpError(400, "Localized content is required");
  return result;
}

async function nextPosition(competitionIdValue: string) {
  const { data, error } = await createAdminSupabase()
    .from("competition_problems")
    .select("position")
    .eq("competition_id", competitionIdValue)
    .order("position", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.position ?? -1) + 1;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const body = jsonObject(await readJsonBody(request, 128_000));
    const maxPoints = Math.round(Number(body.maxPoints) || 100);
    if (maxPoints < 1 || maxPoints > 10_000) {
      throw new HttpError(400, "Problem points must be between 1 and 10000");
    }
    const admin = createAdminSupabase();
    const { data: competition, error: competitionError } = await admin
      .from("competitions")
      .select("*")
      .eq("id", safeId)
      .maybeSingle<CompetitionRow>();
    if (competitionError) throw competitionError;
    if (!competition) throw new HttpError(404, "Competition not found");

    let problemId: string;
    let customProblemCreated = false;
    if (body.source === "existing") {
      problemId = stringField(body.problemId, { min: 1, max: 100 });
      const { data: existing, error } = await admin
        .from("problems")
        .select("id")
        .eq("id", problemId)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      if (!existing) throw new HttpError(404, "Problem not found");
    } else {
      const titleI18n = localizedText(body.titleI18n, 160);
      const descriptionI18n = localizedText(body.descriptionI18n, 20_000);
      const starterCode =
        typeof body.starterCode === "string"
          ? stringField(body.starterCode, { max: 20_000, trim: false })
          : "";
      const testCases = validateTestCases(body.testCases);
      const difficulty =
        body.difficulty === "hard" || body.difficulty === "medium"
          ? body.difficulty
          : "easy";
      const publishMode =
        body.publishMode === "now" ||
        body.publishMode === "after" ||
        body.publishMode === "scheduled"
          ? body.publishMode
          : "never";
      let publishAt: string | null = null;
      if (publishMode === "after") publishAt = competition.ends_at;
      if (publishMode === "scheduled") {
        if (typeof body.publishAt !== "string" || !Number.isFinite(Date.parse(body.publishAt))) {
          throw new HttpError(400, "Publication date is invalid");
        }
        publishAt = new Date(body.publishAt).toISOString();
      }

      const { data: customProblem, error } = await admin
        .from("problems")
        .insert({
          competition_origin_id: safeId,
          description_i18n: descriptionI18n,
          difficulty,
          publish_at: publishMode === "now" ? null : publishAt,
          starter_code: starterCode,
          test_cases: testCases,
          title_i18n: titleI18n,
          visibility: publishMode === "never" ? "competition" : "public",
        })
        .select("id")
        .single<{ id: string }>();
      if (error) throw error;
      problemId = customProblem.id;
      customProblemCreated = true;
    }

    const { data: link, error: linkError } = await admin
      .from("competition_problems")
      .insert({
        competition_id: safeId,
        max_points: maxPoints,
        position: await nextPosition(safeId),
        problem_id: problemId,
      })
      .select("*")
      .single();
    if (linkError?.code === "23505") {
      if (customProblemCreated) {
        await admin.from("problems").delete().eq("id", problemId);
      }
      throw new HttpError(409, "Problem is already in this competition");
    }
    if (linkError) {
      if (customProblemCreated) {
        await admin.from("problems").delete().eq("id", problemId);
      }
      throw linkError;
    }
    return NextResponse.json({ competitionProblem: link }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not add competition problem:", error);
    return NextResponse.json({ error: "Could not add competition problem" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = jsonObject(await readJsonBody(request, 8_000));
    const linkId = stringField(body.linkId, { min: 1, max: 100 });
    const maxPoints = Math.round(Number(body.maxPoints));
    if (!Number.isFinite(maxPoints) || maxPoints < 1 || maxPoints > 10_000) {
      throw new HttpError(400, "Problem points must be between 1 and 10000");
    }
    const { data, error } = await createAdminSupabase()
      .from("competition_problems")
      .update({ max_points: maxPoints })
      .eq("id", linkId)
      .eq("competition_id", competitionId(id))
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ competitionProblem: data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update competition problem:", error);
    return NextResponse.json({ error: "Could not update competition problem" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = jsonObject(await readJsonBody(request, 8_000));
    const linkId = stringField(body.linkId, { min: 1, max: 100 });
    const admin = createAdminSupabase();
    const safeId = competitionId(id);
    const [linkResult, competitionResult, countResult] = await Promise.all([
      admin
        .from("competition_problems")
        .select("problem_id")
        .eq("id", linkId)
        .eq("competition_id", safeId)
        .maybeSingle<{ problem_id: string }>(),
      admin
        .from("competitions")
        .select("status")
        .eq("id", safeId)
        .maybeSingle<{ status: string }>(),
      admin
        .from("competition_problems")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", safeId),
    ]);
    if (linkResult.error) throw linkResult.error;
    if (competitionResult.error) throw competitionResult.error;
    if (countResult.error) throw countResult.error;
    const link = linkResult.data;
    if (!link) throw new HttpError(404, "Competition problem not found");
    if (competitionResult.data?.status === "published" && (countResult.count || 0) <= 1) {
      throw new HttpError(409, "A published competition must keep at least one problem");
    }

    const { error } = await admin
      .from("competition_problems")
      .delete()
      .eq("id", linkId)
      .eq("competition_id", safeId);
    if (error) throw error;
    await admin
      .from("problems")
      .delete()
      .eq("id", link.problem_id)
      .eq("competition_origin_id", safeId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not remove competition problem:", error);
    return NextResponse.json({ error: "Could not remove competition problem" }, { status: 500 });
  }
}
