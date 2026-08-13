import type { MailConfigRow } from "@/lib/mail/types";
import {
  campaignAudience,
  emailAddress,
  mailContent,
  mailMode,
  mailSubject,
  optionalText,
  safeActionUrl,
  senderLocalPart,
  senderName,
} from "@/lib/mail/validation";
import { assertSupportedMailVariables } from "@/lib/mail/variables";
import { HttpError, stringField } from "@/lib/server/requestSecurity";

export function parseCampaignCreate(
  body: Record<string, unknown>,
  config: MailConfigRow,
  createdBy: string
) {
  const subject = mailSubject(body.subject);
  const preheader = optionalText(body.preheader, 240);
  const content = mailContent(body.content);
  const actionLabel = optionalText(body.actionLabel, 80);
  const actionUrl = safeActionUrl(body.actionUrl);
  if (Boolean(actionLabel) !== Boolean(actionUrl)) {
    throw new HttpError(400, "Campaign action label and URL must be used together");
  }
  assertSupportedMailVariables(subject, preheader, content, actionLabel, actionUrl);
  return {
    name: stringField(body.name, { min: 1, max: 120 }),
    subject,
    preheader,
    content,
    mode: mailMode(body.mode, config.default_mode),
    action_label: actionLabel,
    action_url: actionUrl,
    audience: campaignAudience(body.audience),
    sender_name: body.senderName === undefined
      ? config.sender_name
      : senderName(body.senderName),
    sender_local_part: body.senderLocalPart === undefined
      ? config.sender_local_part
      : senderLocalPart(body.senderLocalPart),
    reply_to: body.replyTo === undefined
      ? config.reply_to
      : emailAddress(body.replyTo, false),
    created_by: createdBy,
  };
}

export function parseCampaignPatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = stringField(body.name, { min: 1, max: 120 });
  if ("subject" in body) patch.subject = mailSubject(body.subject);
  if ("preheader" in body) patch.preheader = optionalText(body.preheader, 240);
  if ("content" in body) patch.content = mailContent(body.content);
  if ("mode" in body) patch.mode = mailMode(body.mode);
  if ("audience" in body) patch.audience = campaignAudience(body.audience);
  if ("senderName" in body) patch.sender_name = senderName(body.senderName);
  if ("senderLocalPart" in body) patch.sender_local_part = senderLocalPart(body.senderLocalPart);
  if ("replyTo" in body) patch.reply_to = emailAddress(body.replyTo, false);
  if ("actionLabel" in body) patch.action_label = optionalText(body.actionLabel, 80);
  if ("actionUrl" in body) patch.action_url = safeActionUrl(body.actionUrl);
  if ("scheduleAt" in body && body.scheduleAt === null) {
    patch.schedule_at = null;
    patch.status = "draft";
  }
  assertSupportedMailVariables(
    typeof patch.subject === "string" ? patch.subject : null,
    typeof patch.preheader === "string" ? patch.preheader : null,
    typeof patch.content === "string" ? patch.content : null,
    typeof patch.action_label === "string" ? patch.action_label : null,
    typeof patch.action_url === "string" ? patch.action_url : null
  );
  if (!Object.keys(patch).length) throw new HttpError(400, "No campaign fields to update");
  return patch;
}

