import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import {
  SCRIPTICX_MAIL_DOMAIN,
  type EmailCampaign,
  type EmailCampaignRow,
  type EmailOutboxRow,
  type EmailRecipient,
  type MailCategory,
  type MailConfig,
  type MailConfigRow,
  type MailKind,
  type MailMode,
} from "@/lib/mail/types";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const DEFAULT_MAIL_CONFIG = {
  sender_name: "ScripticX",
  sender_local_part: "hello",
  reply_to: null,
  default_mode: "html" as const,
  contact_notifications_enabled: true,
  transactional_enabled: true,
  marketing_enabled: true,
};

export function publicMailConfig(
  row: MailConfigRow,
  providerConfigured = isEmailWorkerConfigured()
): MailConfig & {
  providerConfigured: boolean;
  senderDomain: typeof SCRIPTICX_MAIL_DOMAIN;
} {
  return {
    senderName: row.sender_name,
    senderLocalPart: row.sender_local_part,
    replyTo: row.reply_to,
    defaultMode: row.default_mode,
    contactNotificationsEnabled: row.contact_notifications_enabled,
    transactionalEnabled: row.transactional_enabled,
    marketingEnabled: row.marketing_enabled,
    updatedAt: row.updated_at,
    providerConfigured,
    senderDomain: SCRIPTICX_MAIL_DOMAIN,
  };
}

export function publicCampaign(row: EmailCampaignRow): EmailCampaign & {
  actionLabel: string | null;
  actionUrl: string | null;
} {
  const campaign = row as EmailCampaignRow & {
    action_label?: string | null;
    action_url?: string | null;
  };
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    preheader: row.preheader,
    content: row.content,
    mode: row.mode,
    audience: row.audience,
    actionLabel: campaign.action_label || null,
    actionUrl: campaign.action_url || null,
    senderName: row.sender_name,
    senderLocalPart: row.sender_local_part,
    replyTo: row.reply_to,
    status: row.status,
    scheduleAt: row.schedule_at,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
  };
}

export async function getMailConfig(admin: SupabaseClient = createAdminSupabase()) {
  const { data, error } = await admin
    .from("email_config")
    .select("*")
    .eq("id", "global")
    .single<MailConfigRow>();
  if (error) throw error;
  return data;
}

type QueueEmailInput = {
  recipient: string;
  recipientUserId?: string | null;
  recipientFirstName?: string | null;
  recipientUsername?: string | null;
  locale?: "ro" | "en";
  kind: MailKind;
  category: MailCategory;
  subject: string;
  preheader?: string | null;
  content: string;
  mode: MailMode;
  actionLabel?: string | null;
  actionUrl?: string | null;
  senderName: string;
  senderLocalPart: string;
  replyTo?: string | null;
  campaignId?: string | null;
  dedupeKey?: string | null;
};

export async function queueEmail(
  input: QueueEmailInput,
  admin: SupabaseClient = createAdminSupabase()
) {
  const record = {
    campaign_id: input.campaignId || null,
    recipient_user_id: input.recipientUserId || null,
    recipient_user_required: Boolean(input.recipientUserId),
    recipient: input.recipient.toLowerCase(),
    recipient_first_name: input.recipientFirstName || null,
    recipient_username: input.recipientUsername || null,
    locale: input.locale || "en",
    kind: input.kind,
    category: input.category,
    subject: input.subject,
    preheader: input.preheader || null,
    content: input.content,
    mode: input.mode,
    action_label: input.actionLabel || null,
    action_url: input.actionUrl || null,
    sender_name: input.senderName,
    sender_local_part: input.senderLocalPart,
    reply_to: input.replyTo || null,
    dedupe_key: input.dedupeKey || null,
  };

  if (input.dedupeKey) {
    const { data, error } = await admin
      .from("email_outbox")
      .upsert(record, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("*")
      .maybeSingle<EmailOutboxRow>();
    if (error) throw error;
    if (data) return data;

    const existing = await admin
      .from("email_outbox")
      .select("*")
      .eq("dedupe_key", input.dedupeKey)
      .single<EmailOutboxRow>();
    if (existing.error) throw existing.error;
    return existing.data;
  }

  const { data, error } = await admin
    .from("email_outbox")
    .insert(record)
    .select("*")
    .single<EmailOutboxRow>();
  if (error) throw error;
  return data;
}

export async function rollingMailDedupeKey(input: {
  scope: string;
  payload: Record<string, unknown>;
  windowMs?: number;
  admin?: SupabaseClient;
}) {
  const admin = input.admin || createAdminSupabase();
  const windowMs = Math.max(60_000, Math.min(30 * 60_000, input.windowMs || 5 * 60_000));
  const bucket = Math.floor(Date.now() / windowMs);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(input.payload))
    .digest("hex")
    .slice(0, 32);
  const keyFor = (value: number) => `${input.scope}:${payloadHash}:${value}`;
  const current = keyFor(bucket);
  const previous = keyFor(bucket - 1);
  const { data, error } = await admin
    .from("email_outbox")
    .select("dedupe_key, created_at")
    .in("dedupe_key", [current, previous])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ dedupe_key: string | null; created_at: string }>();
  if (error) throw error;
  if (
    data?.dedupe_key &&
    Date.parse(data.created_at) >= Date.now() - windowMs
  ) {
    return data.dedupe_key;
  }
  return current;
}

const NOTIFICATION_CATEGORY: Record<string, MailCategory | undefined> = {
  new_assignment: "assignments",
  competition_time: "competitions",
  follow: "social",
  post_mention: "social",
  group_message: "social",
  group_invite: "social",
  live_invite: "social",
};

export async function queueNotificationEmail(input: {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
}) {
  const category = NOTIFICATION_CATEGORY[input.type];
  if (!category) return false;
  const admin = createAdminSupabase();
  const config = await getMailConfig(admin);
  if (!config.transactional_enabled) return false;
  const { data, error } = await admin.rpc("get_email_recipient", {
    p_user_id: input.recipientId,
    p_category: category,
  });
  if (error) throw error;
  const recipient = ((data || []) as EmailRecipient[])[0];
  if (!recipient) return false;
  await queueEmail(
    {
      recipient: recipient.email,
      recipientUserId: recipient.user_id,
      recipientFirstName: recipient.first_name,
      recipientUsername: recipient.username,
      locale: recipient.locale,
      kind: "transactional",
      category,
      subject: input.title,
      preheader: input.body.slice(0, 200),
      content: input.body,
      mode: config.default_mode,
      actionLabel: recipient.locale === "ro" ? "Deschide în ScripticX" : "Open in ScripticX",
      actionUrl: input.href,
      senderName: config.sender_name,
      senderLocalPart: config.sender_local_part,
      replyTo: config.reply_to,
      dedupeKey: `notification:${input.dedupeKey}`,
    },
    admin
  );
  return true;
}

export async function queueContactAdminEmails(input: {
  contactId: string;
  name: string;
  email: string;
  topic: string;
  description: string;
}) {
  const admin = createAdminSupabase();
  const config = await getMailConfig(admin);
  if (!config.contact_notifications_enabled) return 0;
  const { data, error } = await admin.rpc("get_admin_email_recipients");
  if (error) throw error;
  const recipients = (data || []) as EmailRecipient[];
  await Promise.all(
    recipients.map((recipient) => {
      const ro = recipient.locale === "ro";
      return queueEmail(
        {
          recipient: recipient.email,
          recipientUserId: recipient.user_id,
          recipientFirstName: recipient.first_name,
          recipientUsername: recipient.username,
          locale: recipient.locale,
          kind: "admin_alert",
          category: "contact",
          subject: ro
            ? `Mesaj de contact nou: ${input.topic}`
            : `New contact message: ${input.topic}`,
          preheader: ro
            ? `${input.name} a trimis un mesaj nou`
            : `${input.name} sent a new message`,
          content: ro
            ? `Nume: ${input.name}\nEmail: ${input.email}\nSubiect: ${input.topic}\n\n${input.description}`
            : `Name: ${input.name}\nEmail: ${input.email}\nTopic: ${input.topic}\n\n${input.description}`,
          mode: config.default_mode,
          actionLabel: ro ? "Deschide mesajele" : "Open contact inbox",
          actionUrl: "/admin/contact",
          senderName: config.sender_name,
          senderLocalPart: config.sender_local_part,
          replyTo: input.email,
          dedupeKey: `contact:${input.contactId}:admin:${recipient.user_id}`,
        },
        admin
      );
    })
  );
  return recipients.length;
}
