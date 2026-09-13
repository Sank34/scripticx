import { NextResponse } from "next/server";

import { getMailConfig } from "@/lib/mail/service";
import type { EmailCampaignRow } from "@/lib/mail/types";
import { getEmailWorkerHealth, isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { UUID_PATTERN } from "@/lib/mail/validation";
import { enforceRateLimit, HttpError, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({ key: user.id, action: "mail_campaign_send", limit: 10, windowSeconds: 3600 });
    const { campaignId } = await context.params;
    if (!UUID_PATTERN.test(campaignId)) throw new HttpError(400, "Invalid campaign id");
    if (!isEmailWorkerConfigured()) throw new HttpError(503, "Email worker is not configured");
    await getEmailWorkerHealth();
    const admin = createAdminSupabase();
    const config = await getMailConfig(admin);
    if (!config.marketing_enabled) throw new HttpError(409, "Marketing email is disabled");
    const { data: current, error: currentError } = await admin
      .from("email_campaigns").select("*").eq("id", campaignId).maybeSingle<EmailCampaignRow>();
    if (currentError) throw currentError;
    if (!current) throw new HttpError(404, "Campaign not found");
    if (current.status !== "draft" && current.status !== "scheduled") {
      throw new HttpError(409, "Campaign has already been queued");
    }
    const { error } = await admin.from("email_campaigns").update({
      status: "sending",
      schedule_at: null,
      audience_cursor: null,
      expansion_complete: false,
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      sent_at: null,
    }).eq("id", campaignId).in("status", ["draft", "scheduled"]);
    if (error) throw error;
    return NextResponse.json({ queued: 0, status: "sending" });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not queue email campaign:", error);
    return NextResponse.json({ error: "Could not queue email campaign" }, { status: 500 });
  }
}
