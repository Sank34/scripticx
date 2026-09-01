import { NextResponse } from "next/server";

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

type TargetType = "comment" | "group" | "group_message" | "post" | "user";

function uuid(value: unknown) {
  const text = stringField(value, { min: 36, max: 36 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new HttpError(400, "Invalid report target");
  }
  return text;
}

async function targetOwner(targetType: TargetType, targetId: string) {
  const admin = createAdminSupabase();
  const source = targetType === "user"
    ? { table: "profiles", owner: "id" }
    : targetType === "post"
      ? { table: "posts", owner: "user_id" }
      : targetType === "comment"
        ? { table: "comments", owner: "user_id" }
        : targetType === "group"
          ? { table: "study_groups", owner: "owner_id" }
          : { table: "study_group_messages", owner: "user_id" };
  const { data, error } = await admin
    .from(source.table)
    .select(source.owner)
    .eq("id", targetId)
    .maybeSingle<Record<string, unknown>>();
  if (error) throw error;
  if (!data || typeof data[source.owner] !== "string") {
    throw new HttpError(404, "Report target not found");
  }
  return data[source.owner] as string;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      action: "content_report",
      key: user.id,
      limit: 8,
      windowSeconds: 3_600,
    });
    const body = jsonObject(await readJsonBody(request, 8_000));
    const allowedTargets = new Set<TargetType>(["comment", "group", "group_message", "post", "user"]);
    const allowedReasons = new Set(["harassment", "impersonation", "inappropriate", "other", "spam"]);
    if (typeof body.targetType !== "string" || !allowedTargets.has(body.targetType as TargetType)) {
      throw new HttpError(400, "Invalid report target");
    }
    if (typeof body.reason !== "string" || !allowedReasons.has(body.reason)) {
      throw new HttpError(400, "Invalid report reason");
    }
    const targetType = body.targetType as TargetType;
    const targetId = uuid(body.targetId);
    const details = body.details === undefined || body.details === null || body.details === ""
      ? null
      : stringField(body.details, { max: 2_000 });
    const targetUserId = await targetOwner(targetType, targetId);
    if (targetUserId === user.id) throw new HttpError(400, "You cannot report your own content");

    const admin = createAdminSupabase();
    const { data: duplicate, error: duplicateError } = await admin
      .from("content_reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .in("status", ["open", "reviewing"])
      .limit(1)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) throw new HttpError(409, "This content is already in your report queue");

    const { data: report, error } = await admin
      .from("content_reports")
      .insert({
        details,
        reason: body.reason,
        reporter_id: user.id,
        target_id: targetId,
        target_type: targetType,
        target_user_id: targetUserId,
      })
      .select("id,status,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not create report:", error);
    return NextResponse.json({ error: "Could not create report" }, { status: 500 });
  }
}
