export const SCRIPTICX_MAIL_DOMAIN = "scripticx.org";

export type MailMode = "html" | "plain";
export type MailCategory =
  | "newsletter"
  | "product_updates"
  | "assignments"
  | "competitions"
  | "social"
  | "security"
  | "contact";
export type MailKind = "campaign" | "one_off" | "transactional" | "admin_alert";
export type MailStatus = "queued" | "processing" | "sent" | "failed" | "cancelled";

export type MailConfigRow = {
  id: "global";
  sender_name: string;
  sender_local_part: string;
  reply_to: string | null;
  default_mode: MailMode;
  contact_notifications_enabled: boolean;
  transactional_enabled: boolean;
  marketing_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignAudience =
  | { type: "subscribers" }
  | { type: "segment"; segment: "students" | "teachers" | "admins" }
  | { type: "users"; userIds: string[]; identifiers?: string[] };

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type EmailCampaignRow = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  content: string;
  mode: MailMode;
  action_label: string | null;
  action_url: string | null;
  audience: CampaignAudience;
  sender_name: string;
  sender_local_part: string;
  reply_to: string | null;
  status: CampaignStatus;
  schedule_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  audience_cursor: string | null;
  expansion_complete: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export type EmailOutboxRow = {
  id: string;
  campaign_id: string | null;
  recipient_user_id: string | null;
  recipient_user_required: boolean;
  recipient: string;
  recipient_first_name: string | null;
  recipient_username: string | null;
  locale: "ro" | "en";
  kind: MailKind;
  category: MailCategory;
  subject: string;
  preheader: string | null;
  content: string;
  mode: MailMode;
  action_label: string | null;
  action_url: string | null;
  sender_name: string;
  sender_local_part: string;
  reply_to: string | null;
  status: MailStatus;
  dedupe_key: string | null;
  attempts: number;
  max_attempts: number;
  available_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailRecipient = {
  user_id: string;
  email: string;
  locale: "ro" | "en";
  first_name: string | null;
  username: string | null;
};

export type MailConfig = {
  senderName: string;
  senderLocalPart: string;
  replyTo: string | null;
  defaultMode: MailMode;
  contactNotificationsEnabled: boolean;
  transactionalEnabled: boolean;
  marketingEnabled: boolean;
  updatedAt: string;
  providerConfigured: boolean;
  senderDomain: typeof SCRIPTICX_MAIL_DOMAIN;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  content: string;
  mode: MailMode;
  actionLabel: string | null;
  actionUrl: string | null;
  audience: CampaignAudience;
  senderName: string;
  senderLocalPart: string;
  replyTo: string | null;
  status: CampaignStatus;
  scheduleAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};
