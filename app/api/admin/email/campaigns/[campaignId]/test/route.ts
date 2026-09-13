import { NextResponse } from "next/server";

import { queueEmail, rollingMailDedupeKey } from "@/lib/mail/service";
import type { EmailCampaignRow } from "@/lib/mail/types";
import { deliverEmailWithWorker, isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { emailAddress, UUID_PATTERN } from "@/lib/mail/validation";
import { enforceRateLimit, HttpError, jsonObject, readJsonBody, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({ key: user.id, action: "mail_campaign_test", limit: 20, windowSeconds: 3600 });
    if (!isEmailWorkerConfigured()) throw new HttpError(503, "Email worker is not configured");
    const { campaignId } = await context.params;
    if (!UUID_PATTERN.test(campaignId)) throw new HttpError(400, "Invalid campaign id");
    const body = jsonObject(await readJsonBody(request, 2_000));
    const recipient = emailAddress(body.recipient ?? user.email);
    const admin = createAdminSupabase();
    const { data: campaign, error } = await admin
      .from("email_campaigns").select("*").eq("id", campaignId).maybeSingle<EmailCampaignRow>();
    if (error) throw error;
    if (!campaign) throw new HttpError(404, "Campaign not found");
    const dedupeKey = await rollingMailDedupeKey({
      scope: "campaign-test",
      payload: {
        campaignId,
        campaignUpdatedAt: campaign.updated_at,
        recipient,
        mode: campaign.mode,
        subject: campaign.subject,
        preheader: campaign.preheader,
        content: campaign.content,
        actionLabel: campaign.action_label,
        actionUrl: campaign.action_url,
        senderName: campaign.sender_name,
        senderLocalPart: campaign.sender_local_part,
        replyTo: campaign.reply_to,
        locale: user.user_metadata?.locale === "ro" ? "ro" : "en",
      },
      admin,
    });
    const row = await queueEmail({
      recipient: recipient!,
      recipientUserId: recipient === user.email?.toLowerCase() ? user.id : null,
      recipientFirstName: "Test",
      recipientUsername: user.user_metadata?.user_name || "admin",
      locale: user.user_metadata?.locale === "ro" ? "ro" : "en",
      kind: "one_off",
      category: "security",
      subject: `[TEST] ${campaign.subject}`,
      preheader: campaign.preheader,
      content: campaign.content,
      mode: campaign.mode,
      actionLabel: campaign.action_label,
      actionUrl: campaign.action_url,
      senderName: campaign.sender_name,
      senderLocalPart: campaign.sender_local_part,
      replyTo: campaign.reply_to,
      dedupeKey,
    }, admin);
    const delivery = await deliverEmailWithWorker(row.id);
    if (!delivery.sent) throw new HttpError(502, "Test email could not be delivered");
    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not send campaign test email:", error);
    return NextResponse.json({ error: "Could not send campaign test email" }, { status: 500 });
  }
}
