import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { isCompetitionRegistrationOpen } from "@/lib/competitions";
import {
  createAdminSupabase,
  createAuthenticatedServerSupabase,
} from "@/lib/supabaseServer";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
} from "@/lib/server/requestSecurity";
import { competitionId } from "@/lib/server/competitionService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, accessToken } = await requireUser(request);
    const { id } = await context.params;
    const safeCompetitionId = competitionId(id);
    await enforceRateLimit({
      action: "competition_join",
      key: user.id,
      limit: 10,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 4_000));
    const inviteCode =
      typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
    if (inviteCode.length > 200) throw new HttpError(400, "Invite code is invalid");

    const { data: competition, error: competitionError } = await createAdminSupabase()
      .from("competitions")
      .select("status, ends_at, registration_ends_at")
      .eq("id", safeCompetitionId)
      .maybeSingle<{
        ends_at: string;
        registration_ends_at: string | null;
        status: string;
      }>();
    if (competitionError) throw competitionError;
    if (!competition) throw new HttpError(404, "Competition not found");

    const now = new Date();
    if (!isCompetitionRegistrationOpen(competition, now)) {
      const registrationTimestamp = competition.registration_ends_at
        ? Date.parse(competition.registration_ends_at)
        : Number.NaN;
      if (
        Number.isFinite(registrationTimestamp) &&
        now.getTime() >= registrationTimestamp
      ) {
        throw new HttpError(400, "Competition registration deadline has passed");
      }
      throw new HttpError(400, "Competition is not open for registration");
    }

    const inviteHash = inviteCode
      ? createHash("sha256").update(inviteCode).digest("hex")
      : null;

    const { data, error } = await createAuthenticatedServerSupabase(accessToken).rpc(
      "join_competition",
      {
        p_competition_id: safeCompetitionId,
        p_invite_token_hash: inviteHash,
      }
    );
    if (error) {
      const message = /invitation/i.test(error.message)
        ? "Invitation is invalid or expired"
        : /registration/i.test(error.message)
          ? "Competition is not open for registration"
          : "Could not join competition";
      throw new HttpError(400, message);
    }
    return NextResponse.json({ joined: data === true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not join competition:", error);
    return NextResponse.json({ error: "Could not join competition" }, { status: 500 });
  }
}
