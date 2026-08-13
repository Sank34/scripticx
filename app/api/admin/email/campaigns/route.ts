import { NextResponse } from "next/server";

import { parseCampaignCreate } from "@/lib/mail/adminCampaign";
import { getMailConfig, publicCampaign } from "@/lib/mail/service";
import type { CampaignStatus, EmailCampaignRow } from "@/lib/mail/types";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = new Set<CampaignStatus>([
  "draft", "scheduled", "sending", "sent", "failed", "cancelled",
]);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 30));
    const status = params.get("status");
    const cursor = params.get("cursor");
    if (status && !STATUSES.has(status as CampaignStatus)) throw new HttpError(400, "Invalid campaign status");
    if (cursor && !Number.isFinite(Date.parse(cursor))) throw new HttpError(400, "Invalid campaign cursor");
    let query = createAdminSupabase()
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (status) query = query.eq("status", status);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query.returns<EmailCampaignRow[]>();
    if (error) throw error;
    const rows = data || [];
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return NextResponse.json({
      campaigns: page.map(publicCampaign),
      nextCursor: hasMore ? page.at(-1)?.created_at || null : null,
    });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not list email campaigns:", error);
    return NextResponse.json({ error: "Could not list email campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({ key: user.id, action: "mail_campaign_create", limit: 30, windowSeconds: 3600 });
    const body = jsonObject(await readJsonBody(request, 110_000));
    const admin = createAdminSupabase();
    const record = parseCampaignCreate(body, await getMailConfig(admin), user.id);
    const { data, error } = await admin
      .from("email_campaigns")
      .insert(record)
      .select("*")
      .single<EmailCampaignRow>();
    if (error) throw error;
    return NextResponse.json({ campaign: publicCampaign(data) }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not create email campaign:", error);
    return NextResponse.json({ error: "Could not create email campaign" }, { status: 500 });
  }
}

