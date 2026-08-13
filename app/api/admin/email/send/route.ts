import { NextResponse } from "next/server";

import { getMailConfig, queueEmail, rollingMailDedupeKey } from "@/lib/mail/service";
import { deliverEmailWithWorker, isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { assertSupportedMailVariables } from "@/lib/mail/variables";
import {
  emailAddress,
  mailContent,
  mailMode,
  mailSubject,
  optionalText,
  safeActionUrl,
  senderLocalPart,
  senderName,
} from "@/lib/mail/validation";
import { enforceRateLimit, HttpError, jsonObject, readJsonBody, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({ key: user.id, action: "mail_one_off_send", limit: 20, windowSeconds: 3600 });
    if (!isEmailWorkerConfigured()) throw new HttpError(503, "Email worker is not configured");
    const body = jsonObject(await readJsonBody(request, 110_000));
    if (!Array.isArray(body.recipients) || body.recipients.length !== 1) {
      throw new HttpError(400, "One-off email requires exactly one recipient");
    }
    const recipient = emailAddress(body.recipients[0])!;
    const subject = mailSubject(body.subject);
    const preheader = optionalText(body.preheader, 240);
    const content = mailContent(body.content);
    const actionLabel = optionalText(body.actionLabel, 80);
    const actionUrl = safeActionUrl(body.actionUrl);
    if (Boolean(actionLabel) !== Boolean(actionUrl)) throw new HttpError(400, "Email action label and URL must be used together");
    assertSupportedMailVariables(subject, preheader, content, actionLabel, actionUrl);
    const admin = createAdminSupabase();
    const config = await getMailConfig(admin);
    const mode = mailMode(body.mode, config.default_mode);
    const fromName = body.senderName === undefined ? config.sender_name : senderName(body.senderName);
    const fromLocalPart = body.senderLocalPart === undefined ? config.sender_local_part : senderLocalPart(body.senderLocalPart);
    const replyTo = body.replyTo === undefined ? config.reply_to : emailAddress(body.replyTo, false);
    const locale = body.locale === "ro" ? "ro" : "en";
    const dedupeKey = await rollingMailDedupeKey({
      scope: "one-off",
      payload: {
        actor: user.id,
        recipient,
        locale,
        mode,
        subject,
        preheader,
        content,
        actionLabel,
        actionUrl,
        fromName,
        fromLocalPart,
        replyTo,
      },
      admin,
    });
    const row = await queueEmail({
      recipient,
      recipientFirstName: recipient.split("@")[0],
      recipientUsername: recipient.split("@")[0],
      locale,
      kind: "one_off",
      category: "security",
      subject,
      preheader,
      content,
      mode,
      actionLabel,
      actionUrl,
      senderName: fromName,
      senderLocalPart: fromLocalPart,
      replyTo,
      dedupeKey,
    }, admin);
    const delivery = await deliverEmailWithWorker(row.id);
    if (!delivery.sent) throw new HttpError(502, "Email could not be delivered");
    return NextResponse.json({ queued: 1, sent: true });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not send one-off email:", error);
    return NextResponse.json({ error: "Could not send one-off email" }, { status: 500 });
  }
}
