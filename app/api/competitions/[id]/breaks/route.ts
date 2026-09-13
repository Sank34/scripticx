import { NextResponse } from "next/server";

import { competitionId, type CompetitionRow } from "@/lib/server/competitionService";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const body = jsonObject(await readJsonBody(request, 8_000));
    const title = stringField(body.title || "Pauză", { min: 1, max: 100 });
    const startsAt = stringField(body.startsAt, { min: 10, max: 40 });
    const endsAt = stringField(body.endsAt, { min: 10, max: 40 });
    if (
      !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt)) ||
      Date.parse(endsAt) <= Date.parse(startsAt)
    ) {
      throw new HttpError(400, "Break window is invalid");
    }
    const admin = createAdminSupabase();
    const { data: competition, error: competitionError } = await admin
      .from("competitions")
      .select("starts_at, ends_at")
      .eq("id", safeId)
      .maybeSingle<Pick<CompetitionRow, "starts_at" | "ends_at">>();
    if (competitionError) throw competitionError;
    if (!competition) throw new HttpError(404, "Competition not found");
    if (
      Date.parse(startsAt) < Date.parse(competition.starts_at) ||
      Date.parse(endsAt) > Date.parse(competition.ends_at)
    ) {
      throw new HttpError(400, "Break must be inside the competition window");
    }
    const { data: overlap, error: overlapError } = await admin
      .from("competition_breaks")
      .select("id")
      .eq("competition_id", safeId)
      .lt("starts_at", new Date(endsAt).toISOString())
      .gt("ends_at", new Date(startsAt).toISOString())
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (overlapError) throw overlapError;
    if (overlap) throw new HttpError(409, "Break windows cannot overlap");

    const { data, error } = await admin
      .from("competition_breaks")
      .insert({
        competition_id: safeId,
        ends_at: new Date(endsAt).toISOString(),
        starts_at: new Date(startsAt).toISOString(),
        title,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ competitionBreak: data }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not add competition break:", error);
    return NextResponse.json({ error: "Could not add competition break" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = jsonObject(await readJsonBody(request, 4_000));
    const breakId = stringField(body.breakId, { min: 1, max: 100 });
    const { error } = await createAdminSupabase()
      .from("competition_breaks")
      .delete()
      .eq("id", breakId)
      .eq("competition_id", competitionId(id));
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not remove competition break:", error);
    return NextResponse.json({ error: "Could not remove competition break" }, { status: 500 });
  }
}
