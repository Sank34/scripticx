import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

function safeUserId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, "Invalid user id");
  }
  return value;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAdmin(request);
    const { userId } = await context.params;
    const targetId = safeUserId(userId);
    if (targetId === user.id) throw new HttpError(400, "You cannot moderate your own account");
    await enforceRateLimit({
      action: "admin_companion_user_moderation",
      key: user.id,
      limit: 30,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 8_000));
    if (typeof body.banned !== "boolean") throw new HttpError(400, "Invalid moderation action");
    const note = body.note === undefined || body.note === null || body.note === ""
      ? null
      : stringField(body.note, { max: 2_000 });
    const admin = createAdminSupabase();
    const { data: current, error: readError } = await admin
      .from("profiles")
      .select("id,username,avatar_url,role,banned,total_score")
      .eq("id", targetId)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new HttpError(404, "User not found");
    if (current.role === "admin") throw new HttpError(400, "Another admin cannot be moderated here");

    const { data: profile, error: updateError } = await admin
      .from("profiles")
      .update({ banned: body.banned })
      .eq("id", targetId)
      .select("id,username,avatar_url,role,banned,total_score")
      .single();
    if (updateError) throw updateError;

    const { error: auditError } = await admin.from("admin_moderation_log").insert({
      action: body.banned ? "ban_user" : "unban_user",
      actor_id: user.id,
      metadata: { previousBanned: Boolean(current.banned) },
      note,
      target_user_id: targetId,
    });
    if (auditError) throw auditError;

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not moderate user:", error);
    return NextResponse.json({ error: "Could not moderate user" }, { status: 500 });
  }
}
