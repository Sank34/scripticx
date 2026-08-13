import { NextResponse } from "next/server";

import { parseCampaignPatch } from "@/lib/mail/adminCampaign";
import { publicCampaign } from "@/lib/mail/service";
import type { EmailCampaignRow } from "@/lib/mail/types";
import { UUID_PATTERN } from "@/lib/mail/validation";
import { HttpError, jsonObject, readJsonBody, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ campaignId: string }> };

async function id(context: Context) {
  const { campaignId } = await context.params;
  if (!UUID_PATTERN.test(campaignId)) throw new HttpError(400, "Invalid campaign id");
  return campaignId;
}

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { data, error } = await createAdminSupabase()
      .from("email_campaigns")
      .select("*")
      .eq("id", await id(context))
      .maybeSingle<EmailCampaignRow>();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Campaign not found");
    return NextResponse.json({ campaign: publicCampaign(data) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not read email campaign:", error);
    return NextResponse.json({ error: "Could not read email campaign" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const campaignId = await id(context);
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle<EmailCampaignRow>();
    if (currentError) throw currentError;
    if (!current) throw new HttpError(404, "Campaign not found");
    if (current.status !== "draft" && current.status !== "scheduled") {
      throw new HttpError(409, "This campaign can no longer be edited");
    }
    const body = jsonObject(await readJsonBody(request, 110_000));
    const patch = parseCampaignPatch(body);
    const nextActionLabel = "action_label" in patch ? patch.action_label : current.action_label;
    const nextActionUrl = "action_url" in patch ? patch.action_url : current.action_url;
    if (Boolean(nextActionLabel) !== Boolean(nextActionUrl)) {
      throw new HttpError(400, "Campaign action label and URL must be used together");
    }
    const { data, error } = await admin
      .from("email_campaigns")
      .update(patch)
      .eq("id", campaignId)
      .in("status", ["draft", "scheduled"])
      .select("*")
      .maybeSingle<EmailCampaignRow>();
    if (error) throw error;
    if (!data) throw new HttpError(409, "Campaign started while it was being edited");
    return NextResponse.json({ campaign: publicCampaign(data) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not update email campaign:", error);
    return NextResponse.json({ error: "Could not update email campaign" }, { status: 500 });
  }
}
