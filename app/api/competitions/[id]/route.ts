import { NextResponse } from "next/server";

import {
  isValidCompetitionWindow,
  slugifyCompetitionName,
} from "@/lib/competitions";
import {
  competitionId,
  readCompetitionDetail,
  type CompetitionRow,
} from "@/lib/server/competitionService";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role } = await requireUser(request);
    const competition = await readCompetitionDetail(
      createAdminSupabase(),
      id,
      user.id,
      role === "admin"
    );
    return NextResponse.json({ competition });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not read competition:", error);
    return NextResponse.json({ error: "Could not read competition" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const body = jsonObject(await readJsonBody(request, 32_000));
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin
      .from("competitions")
      .select("*")
      .eq("id", safeId)
      .maybeSingle<CompetitionRow>();
    if (currentError) throw currentError;
    if (!current) throw new HttpError(404, "Competition not found");

    const name =
      body.name === undefined
        ? current.name
        : stringField(body.name, { min: 3, max: 120 });
    const description =
      body.description === undefined
        ? current.description
        : stringField(body.description, { max: 5_000 });
    const slug =
      body.slug === undefined
        ? current.slug
        : slugifyCompetitionName(stringField(body.slug, { min: 1, max: 100 }));
    const startsAt =
      typeof body.startsAt === "string" ? body.startsAt : current.starts_at;
    const endsAt = typeof body.endsAt === "string" ? body.endsAt : current.ends_at;
    if (!isValidCompetitionWindow(startsAt, endsAt)) {
      throw new HttpError(400, "Competition end must be after its start");
    }

    const visibility =
      body.visibility === undefined
        ? current.visibility
        : body.visibility === "private"
          ? "private"
          : "public";
    const status =
      body.status === undefined
        ? current.status
        : body.status === "published" || body.status === "cancelled"
          ? body.status
          : "draft";
    const reminderInterval =
      body.reminderIntervalMinutes === undefined
        ? current.reminder_interval_minutes
        : Math.round(Number(body.reminderIntervalMinutes));
    if (reminderInterval < 5 || reminderInterval > 180) {
      throw new HttpError(400, "Reminder interval must be between 5 and 180 minutes");
    }
    let registrationEndsAt = current.registration_ends_at;
    if (body.registrationEndsAt !== undefined) {
      if (body.registrationEndsAt === null || body.registrationEndsAt === "") {
        registrationEndsAt = null;
      } else if (typeof body.registrationEndsAt === "string") {
        const registrationTimestamp = Date.parse(body.registrationEndsAt);
        if (!Number.isFinite(registrationTimestamp)) {
          throw new HttpError(400, "Registration deadline is invalid");
        }
        registrationEndsAt = new Date(registrationTimestamp).toISOString();
      } else {
        throw new HttpError(400, "Registration deadline is invalid");
      }
    }
    if (registrationEndsAt && Date.parse(registrationEndsAt) > Date.parse(endsAt)) {
      throw new HttpError(400, "Registration deadline is invalid");
    }

    const { data: configuredBreaks, error: breaksError } = await admin
      .from("competition_breaks")
      .select("starts_at, ends_at")
      .eq("competition_id", safeId);
    if (breaksError) throw breaksError;
    if (
      (configuredBreaks || []).some(
        (item) =>
          Date.parse(item.starts_at) < Date.parse(startsAt) ||
          Date.parse(item.ends_at) > Date.parse(endsAt)
      )
    ) {
      throw new HttpError(400, "The competition window must contain every configured break");
    }

    if (status === "published" && current.status !== "published") {
      const { count, error: countError } = await admin
        .from("competition_problems")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", safeId);
      if (countError) throw countError;
      if (!count) {
        throw new HttpError(400, "Add at least one problem before publishing");
      }
    }

    const { data, error } = await admin
      .from("competitions")
      .update({
        description,
        ends_at: new Date(endsAt).toISOString(),
        name,
        registration_ends_at: registrationEndsAt,
        reminder_interval_minutes: reminderInterval,
        show_live_leaderboard:
          body.showLiveLeaderboard === undefined
            ? current.show_live_leaderboard
            : body.showLiveLeaderboard === true,
        slug,
        starts_at: new Date(startsAt).toISOString(),
        status,
        updated_at: new Date().toISOString(),
        visibility,
      })
      .eq("id", safeId)
      .select("*")
      .single();
    if (error?.code === "23505") {
      throw new HttpError(409, "A competition with this slug already exists");
    }
    if (error) throw error;
    return NextResponse.json({ competition: data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update competition:", error);
    return NextResponse.json({ error: "Could not update competition" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { error } = await createAdminSupabase()
      .from("competitions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", competitionId(id));
    if (error) throw error;
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not cancel competition:", error);
    return NextResponse.json({ error: "Could not cancel competition" }, { status: 500 });
  }
}
