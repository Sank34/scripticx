import { supabase } from "@/lib/supabase";

export type EmailPreferences = {
  newsletter: boolean;
  product_updates: boolean;
  assignments: boolean;
  competitions: boolean;
  social: boolean;
};

export type EmailPreferencePatch = Partial<EmailPreferences> & {
  locale?: "en" | "ro";
};

type MailErrorPayload = {
  error?: string;
  retryAfterSeconds?: number;
};

export class MailClientError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds?: number | null
  ) {
    super(message);
    this.name = "MailClientError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}

export async function authenticatedMailRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new MailClientError("Authentication required", 401);
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T &
    MailErrorPayload;

  if (!response.ok) {
    throw new MailClientError(
      payload.error || "The mail request could not be completed",
      response.status,
      payload.retryAfterSeconds
    );
  }

  return payload;
}

export async function resendVerificationEmail(locale: "en" | "ro") {
  return authenticatedMailRequest<{
    sent: true;
    retryAfterSeconds?: number;
  }>("/api/mail/verification/resend", {
    method: "POST",
    body: JSON.stringify({ locale }),
  });
}

export async function getEmailPreferences() {
  const result = await authenticatedMailRequest<{
    preferences: EmailPreferences;
  }>("/api/mail/preferences");

  return result.preferences;
}

export async function updateEmailPreferences(patch: EmailPreferencePatch) {
  const result = await authenticatedMailRequest<{
    preferences: EmailPreferences;
  }>("/api/mail/preferences", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  return result.preferences;
}
