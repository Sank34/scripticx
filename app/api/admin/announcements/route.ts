import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";
import { logger } from "@/lib/loggerSystem";
import { HttpError, jsonObject, readJsonBody, requireAdmin, stringField } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    const body = jsonObject(await readJsonBody(request, 20_000));
    const title = stringField(body.title, { min: 2, max: 160 });
    const message = stringField(body.body, { min: 2, max: 2_000 });
    const href = typeof body.href === "string" && body.href.trim().startsWith("/") ? body.href.trim().slice(0, 500) : null;
    const admin = createAdminSupabase();
    const { data: profiles, error: profilesError } = await admin.from("profiles").select("id").limit(10_000);
    if (profilesError) throw profilesError;
    const announcementId = randomUUID();
    const rows = (profiles || []).map((profile) => ({
      user_id: profile.id,
      actor_id: user.id,
      type: "platform_announcement",
      title,
      body: message,
      href,
      metadata: { announcementId, platform: "ScripticX" },
      dedupe_key: `platform_announcement:${announcementId}:${profile.id}`,
    }));
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await admin.from("notifications").insert(rows.slice(index, index + 500));
      if (error) throw error;
    }
    logger.success("announcements", "Platform announcement sent", { recipients: rows.length, announcementId });
    return NextResponse.json({ created: rows.length, announcementId }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    logger.error("announcements", "Could not send platform announcement", { error });
    return NextResponse.json({ error: "Could not send platform announcement" }, { status: 500 });
  }
}
