import { NextResponse } from "next/server";

import {
  isValidCompetitionWindow,
  slugifyCompetitionName,
} from "@/lib/competitions";
import { listCompetitionSummaries } from "@/lib/server/competitionService";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, role } = await requireUser(request);
    const wantsAdmin = new URL(request.url).searchParams.get("scope") === "admin";
    if (wantsAdmin && role !== "admin") {
      throw new HttpError(403, "Admin access required");
    }
    const competitions = await listCompetitionSummaries(
      createAdminSupabase(),
      user.id,
      wantsAdmin
    );
    return NextResponse.json({ competitions });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not list competitions:", error);
    return NextResponse.json({ error: "Could not list competitions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    const body = jsonObject(await readJsonBody(request, 32_000));
    const name = stringField(body.name, { min: 3, max: 120 });
    const description = stringField(body.description || "", { max: 5_000 });
    const slug = slugifyCompetitionName(
      typeof body.slug === "string" && body.slug.trim() ? body.slug : name
    );
    if (!slug) throw new HttpError(400, "Competition slug is invalid");

    const startsAt = stringField(body.startsAt, { min: 10, max: 40 });
    const endsAt = stringField(body.endsAt, { min: 10, max: 40 });
    if (!isValidCompetitionWindow(startsAt, endsAt)) {
      throw new HttpError(400, "Competition end must be after its start");
    }
    const registrationEndsAt =
      typeof body.registrationEndsAt === "string" && body.registrationEndsAt
        ? body.registrationEndsAt
        : null;
    if (
      registrationEndsAt &&
      (!Number.isFinite(Date.parse(registrationEndsAt)) ||
        Date.parse(registrationEndsAt) > Date.parse(endsAt))
    ) {
      throw new HttpError(400, "Registration deadline is invalid");
    }

    const visibility = body.visibility === "private" ? "private" : "public";
    const status = body.status === "published" ? "published" : "draft";
    const reminderInterval = Math.round(Number(body.reminderIntervalMinutes) || 30);
    if (reminderInterval < 5 || reminderInterval > 180) {
      throw new HttpError(400, "Reminder interval must be between 5 and 180 minutes");
    }

    const { data, error } = await createAdminSupabase()
      .from("competitions")
      .insert({
        created_by: user.id,
        description,
        ends_at: new Date(endsAt).toISOString(),
        name,
        registration_ends_at: registrationEndsAt
          ? new Date(registrationEndsAt).toISOString()
          : null,
        reminder_interval_minutes: reminderInterval,
        show_live_leaderboard: body.showLiveLeaderboard !== false,
        slug,
        starts_at: new Date(startsAt).toISOString(),
        status,
        visibility,
      })
      .select("*")
      .single();
    if (error?.code === "23505") {
      throw new HttpError(409, "A competition with this slug already exists");
    }
    if (error) throw error;

    return NextResponse.json({ competition: data }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not create competition:", error);
    return NextResponse.json({ error: "Could not create competition" }, { status: 500 });
  }
}
