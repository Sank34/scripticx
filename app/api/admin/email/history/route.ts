import { NextResponse } from "next/server";

import type { EmailOutboxRow, MailStatus } from "@/lib/mail/types";
import { UUID_PATTERN } from "@/lib/mail/validation";
import { HttpError, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const statuses = new Set<MailStatus>(["queued", "processing", "sent", "failed", "cancelled"]);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 40));
    const status = params.get("status");
    const campaignId = params.get("campaignId");
    const cursor = params.get("cursor");
    if (status && !statuses.has(status as MailStatus)) throw new HttpError(400, "Invalid delivery status");
    if (campaignId && !UUID_PATTERN.test(campaignId)) throw new HttpError(400, "Invalid campaign id");
    if (cursor && !Number.isFinite(Date.parse(cursor))) throw new HttpError(400, "Invalid history cursor");
    let query = createAdminSupabase().from("email_outbox").select("*").order("created_at", { ascending: false }).limit(limit + 1);
    if (status) query = query.eq("status", status);
    if (campaignId) query = query.eq("campaign_id", campaignId);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query.returns<EmailOutboxRow[]>();
    if (error) throw error;
    const rows = data || [];
    const page = rows.slice(0, limit);
    return NextResponse.json({
      messages: page.map((row) => ({
        id: row.id,
        recipient: row.recipient,
        subject: row.subject,
        kind: row.kind,
        status: row.status,
        providerMessageId: row.provider_message_id,
        error: row.last_error,
        createdAt: row.created_at,
        sentAt: row.sent_at,
        campaignId: row.campaign_id,
      })),
      nextCursor: rows.length > limit ? page.at(-1)?.created_at || null : null,
    });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not read email history:", error);
    return NextResponse.json({ error: "Could not read email history" }, { status: 500 });
  }
}

