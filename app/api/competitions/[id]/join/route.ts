import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { createAuthenticatedServerSupabase } from "@/lib/supabaseServer";
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
    const inviteHash = inviteCode
      ? createHash("sha256").update(inviteCode).digest("hex")
      : null;

    const { data, error } = await createAuthenticatedServerSupabase(accessToken).rpc(
      "join_competition",
      {
        p_competition_id: competitionId(id),
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
