import { authenticatedMailRequest } from "@/lib/mail-client";

export type EmailContentMode = "html" | "plain";
export type EmailCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type EmailAudience =
  | { type: "subscribers" }
  | { type: "segment"; segment: "students" | "teachers" | "admins" }
  | { type: "users"; userIds: string[] };

export type EmailConfig = {
  senderName: string;
  senderLocalPart: string;
  replyTo: string | null;
  defaultMode: EmailContentMode;
  contactNotificationsEnabled: boolean;
  transactionalEnabled: boolean;
  marketingEnabled: boolean;
  providerConfigured: boolean;
  senderDomain: "scripticx.org";
  updatedAt: string;
};

export type EmailCampaign = {
  actionLabel: string | null;
  actionUrl: string | null;
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  content: string;
  mode: EmailContentMode;
  audience: EmailAudience;
  senderName: string;
  senderLocalPart: string;
  replyTo: string | null;
  status: EmailCampaignStatus;
  scheduleAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailHistoryMessage = {
  id: string;
  recipient: string;
  subject: string;
  kind: string;
  status: string;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  campaignId: string | null;
};

export type EmailCampaignInput = {
  actionLabel?: string | null;
  actionUrl?: string | null;
  name: string;
  subject: string;
  preheader?: string;
  content: string;
  mode: EmailContentMode;
  audience: EmailAudience;
  senderName?: string;
  senderLocalPart?: string;
  replyTo?: string | null;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  try {
    return await authenticatedMailRequest<T>(input, init);
  } catch (error) {
    const payload = error as ApiErrorPayload;
    throw new Error(payload.error || payload.message || (error instanceof Error ? error.message : "Request failed"));
  }
}

export async function fetchEmailConfig() {
  const result = await request<{ config: EmailConfig }>("/api/admin/email/config");
  return result.config;
}

export async function updateEmailConfig(input: Partial<EmailConfig>) {
  const result = await request<{ config: EmailConfig }>("/api/admin/email/config", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return result.config;
}

export async function fetchEmailCampaigns() {
  const result = await request<{
    campaigns: EmailCampaign[];
    nextCursor: string | null;
  }>("/api/admin/email/campaigns?limit=50");
  return result.campaigns;
}

export async function createEmailCampaign(input: EmailCampaignInput) {
  const result = await request<{ campaign: EmailCampaign }>(
    "/api/admin/email/campaigns",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return result.campaign;
}

export async function updateEmailCampaign(
  campaignId: string,
  input: Partial<EmailCampaignInput> & { scheduleAt?: string | null }
) {
  const result = await request<{ campaign: EmailCampaign }>(
    `/api/admin/email/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return result.campaign;
}

export async function sendEmailCampaignTest(campaignId: string, recipient?: string) {
  return request<{ sent: true }>(
    `/api/admin/email/campaigns/${encodeURIComponent(campaignId)}/test`,
    {
      method: "POST",
      body: JSON.stringify(recipient ? { recipient } : {}),
    }
  );
}

export async function sendEmailCampaign(campaignId: string) {
  return request<{ queued: number; status: "sending" | "sent" }>(
    `/api/admin/email/campaigns/${encodeURIComponent(campaignId)}/send`,
    { method: "POST", body: "{}" }
  );
}

export async function scheduleEmailCampaign(campaignId: string, scheduleAt: string) {
  const result = await request<{ campaign: EmailCampaign }>(
    `/api/admin/email/campaigns/${encodeURIComponent(campaignId)}/schedule`,
    {
      method: "POST",
      body: JSON.stringify({ scheduleAt }),
    }
  );
  return result.campaign;
}

export async function fetchEmailHistory() {
  const result = await request<{
    messages: EmailHistoryMessage[];
    nextCursor: string | null;
  }>("/api/admin/email/history?limit=100");
  return result.messages;
}

export async function previewEmail(input: {
  actionLabel?: string | null;
  actionUrl?: string | null;
  subject: string;
  preheader?: string;
  content: string;
  mode: EmailContentMode;
  locale?: "en" | "ro";
  senderName?: string;
}) {
  return request<{ html: string | null; text: string }>(
    "/api/admin/email/preview",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}
