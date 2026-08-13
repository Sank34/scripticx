import { NextResponse } from "next/server";

import { getMailConfig, publicCampaign } from "@/lib/mail/service";
import type { EmailCampaignRow } from "@/lib/mail/types";
import { getEmailWorkerHealth, isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { isoDate, UUID_PATTERN } from "@/lib/mail/validation";
import { HttpError, jsonObject, readJsonBody, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { campaignId } = await context.params;
    if (!UUID_PATTERN.test(campaignId)) throw new HttpError(400, "Invalid campaign id");
    if (!isEmailWorkerConfigured()) throw new HttpError(503, "Email worker is not configured");
    await getEmailWorkerHealth();
    const body = jsonObject(await readJsonBody(request, 2_000));
    const admin = createAdminSupabase();
    if (!(await getMailConfig(admin)).marketing_enabled) throw new HttpError(409, "Marketing email is disabled");
    const { data, error } = await admin
      .from("email_campaigns")
      .update({ status: "scheduled", schedule_at: isoDate(body.scheduleAt, { future: true }) })
      .eq("id", campaignId)
      .in("status", ["draft", "scheduled"])
      .select("*")
      .maybeSingle<EmailCampaignRow>();
    if (error) throw error;
    if (!data) throw new HttpError(409, "Campaign cannot be scheduled");
    return NextResponse.json({ campaign: publicCampaign(data) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not schedule email campaign:", error);
    return NextResponse.json({ error: "Could not schedule email campaign" }, { status: 500 });
  }
}
