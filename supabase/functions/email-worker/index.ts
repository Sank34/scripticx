import { createClient } from "npm:@supabase/supabase-js@2.100.0";

const MAIL_DOMAIN = "scripticx.org";
const DEFAULT_SITE_URL = "https://platform.scripticx.org";
const MAX_DELIVERY_LIMIT = 25;
const MAX_EXPANSION_LIMIT = 1_000;
const WORKER_BUDGET_MS = 45_000;
const RESEND_WAVE_SIZE = 3;
const RESEND_WAVE_DELAY_MS = 1_050;
const IDEMPOTENCY_SAFETY_WINDOW_MS = 23 * 60 * 60 * 1_000;

type Locale = "en" | "ro";
type MailMode = "html" | "plain";
type MarketingCategory = "newsletter" | "product_updates";

type MailConfigRow = {
  contact_notifications_enabled: boolean;
  marketing_enabled: boolean;
  transactional_enabled: boolean;
};

type EmailRecipient = {
  user_id: string;
  email: string;
  locale: Locale;
  first_name: string | null;
  username: string | null;
};

type EmailOutboxRow = {
  id: string;
  campaign_id: string | null;
  recipient_user_id: string | null;
  recipient_user_required: boolean;
  recipient: string;
  recipient_first_name: string | null;
  recipient_username: string | null;
  locale: Locale;
  kind: "campaign" | "one_off" | "transactional" | "admin_alert";
  category:
    | MarketingCategory
    | "assignments"
    | "competitions"
    | "social"
    | "security"
    | "contact";
  subject: string;
  preheader: string | null;
  content: string;
  mode: MailMode;
  action_label: string | null;
  action_url: string | null;
  sender_name: string;
  sender_local_part: string;
  reply_to: string | null;
  status: "queued" | "processing" | "sent" | "failed" | "cancelled";
  attempts: number;
  max_attempts: number;
  available_at: string;
  last_attempt_at: string | null;
  created_at: string;
};

type DeliveryOutcome = "sent" | "retrying" | "failed" | "cancelled";

type WorkerRequest =
  | { mode: "health" }
  | { mode: "queue"; deliveryLimit: number; expansionLimit: number }
  | { mode: "deliver"; outboxId: string };

class DeliveryError extends Error {
  permanent: boolean;
  retryAfterMs: number | null;

  constructor(message: string, options: { permanent?: boolean; retryAfterMs?: number | null } = {}) {
    super(message);
    this.name = "DeliveryError";
    this.permanent = options.permanent === true;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function adminKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed = JSON.parse(modernKeys) as Record<string, unknown>;
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Fall through to the single-key and legacy environments.
    }
  }
  return (
    Deno.env.get("SUPABASE_SECRET_KEY")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    ""
  );
}

function createAdminClient() {
  const url = requiredEnv("SUPABASE_URL");
  const key = adminKey();
  if (!key) throw new Error("Supabase secret key is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "scripticx-email-worker/1.0" } },
  });
}

async function secretDigest(value: string) {
  const encoder = new TextEncoder();
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function timingSafeEqual(left: string, right: string) {
  const [leftBytes, rightBytes] = await Promise.all([
    secretDigest(left),
    secretDigest(right),
  ]);
  let difference = left.length === right.length ? 0 : 1;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function workerSecretMatches(request: Request) {
  const supplied = suppliedWorkerSecret(request);
  if (!supplied) return false;
  const canonical = Deno.env.get("MAIL_WORKER_SECRET")?.trim() || "";
  return canonical.length >= 32 && await timingSafeEqual(canonical, supplied);
}

function suppliedWorkerSecret(request: Request) {
  const dedicatedHeader = request.headers.get("x-scripticx-worker-secret")?.trim();
  if (dedicatedHeader) return dedicatedHeader;
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function boundedInteger(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(1, value));
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function workerRequest(request: Request): Promise<WorkerRequest> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new DeliveryError("Expected an application/json request", { permanent: true });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["health", "queue", "deliver"].includes(String(body.mode))) {
    throw new DeliveryError("Invalid email worker mode", { permanent: true });
  }
  if (body.mode === "health") return { mode: "health" };
  if (body.mode === "deliver") {
    if (typeof body.outboxId !== "string" || !uuidPattern.test(body.outboxId)) {
      throw new DeliveryError("Invalid outboxId", { permanent: true });
    }
    return { mode: "deliver", outboxId: body.outboxId };
  }
  return {
    mode: "queue",
    deliveryLimit: boundedInteger(body.deliveryLimit, MAX_DELIVERY_LIMIT, MAX_DELIVERY_LIMIT),
    expansionLimit: boundedInteger(body.expansionLimit, 500, MAX_EXPANSION_LIMIT),
  };
}

function siteUrl() {
  const configured =
    Deno.env.get("SITE_URL") ||
    Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
    DEFAULT_SITE_URL;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) {
      return DEFAULT_SITE_URL;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl()}/`).toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphHtml(content: string) {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safe = escapeHtml(paragraph).replaceAll("\n", "<br>");
      return `<p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">${safe}</p>`;
    })
    .join("");
}

function renderEmail(input: {
  subject: string;
  preheader: string | null;
  content: string;
  mode: MailMode;
  locale: Locale;
  senderName: string;
  actionLabel: string | null;
  actionUrl: string | null;
  unsubscribeUrl: string | null;
}) {
  const ro = input.locale === "ro";
  const action = input.actionLabel && input.actionUrl
    ? `\n\n${input.actionLabel}: ${input.actionUrl}`
    : "";
  const unsubscribe = input.unsubscribeUrl
    ? `\n\n${ro ? "Dezabonare de la emailurile de marketing" : "Unsubscribe from marketing emails"}: ${input.unsubscribeUrl}`
    : "";
  const text = `${input.subject}\n\n${input.content.trim()}${action}${unsubscribe}\n\n— ${input.senderName}`;
  if (input.mode === "plain") return { html: null, text };

  const subject = escapeHtml(input.subject);
  const preheader = escapeHtml(input.preheader || input.subject);
  const actionHtml = input.actionLabel && input.actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;"><tr><td style="border-radius:10px;background:#111827;"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(input.actionLabel)}</a></td></tr></table>`
    : "";
  const unsubscribeHtml = input.unsubscribeUrl
    ? `<p style="margin:14px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">${ro ? "Primești acest mesaj deoarece te-ai abonat la emailurile ScripticX." : "You receive this because you subscribed to ScripticX emails."} <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#64748b;">${ro ? "Dezabonare" : "Unsubscribe"}</a>.</p>`
    : "";
  const logoUrl = absoluteUrl("/scripticx-logo-lung.png");

  const html = `<!doctype html>
<html lang="${ro ? "ro" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f6f7fb;color:#0f172a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;">
    <tr><td style="padding:0 8px 20px;"><img src="${logoUrl}" width="150" alt="ScripticX" style="display:block;height:auto;border:0;"></td></tr>
    <tr><td style="overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;box-shadow:0 10px 30px rgba(15,23,42,.06);">
      <div style="height:5px;background:linear-gradient(90deg,#0ea5e9,#6366f1,#8b5cf6);"></div>
      <div style="padding:38px 38px 32px;">
        <p style="margin:0 0 10px;color:#6366f1;font-size:13px;font-weight:700;">${escapeHtml(input.senderName)}</p>
        <h1 style="margin:0 0 24px;color:#0f172a;font-size:29px;line-height:1.2;letter-spacing:-.025em;">${subject}</h1>
        ${paragraphHtml(input.content)}
        ${actionHtml}
      </div>
    </td></tr>
    <tr><td style="padding:20px 10px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
      <p style="margin:0;">${ro ? "Învață, construiește și evoluează cu ScripticX." : "Learn, build and grow with ScripticX."}</p>
      ${unsubscribeHtml}
      <p style="margin:8px 0 0;">© ${new Date().getUTCFullYear()} ScripticX</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  return { html, text };
}

const variablePattern = /{{\s*([a-z_][a-z0-9_]*)\s*}}/gi;
const supportedVariables = new Set([
  "first_name",
  "username",
  "email",
  "action_url",
  "unsubscribe_url",
]);

function interpolate(source: string, values: Record<string, string>) {
  return source.replace(variablePattern, (_token, rawName: string) => {
    const name = rawName.toLowerCase();
    return supportedVariables.has(name) ? values[name] || "" : "";
  });
}

function validActionUrl(candidate: string) {
  if (!candidate) return "";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return absoluteUrl(candidate);
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) {
      return url.toString();
    }
  } catch {
    // Invalid and unsafe URLs are omitted from the delivered email.
  }
  return "";
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function unsubscribeUrl(userId: string, category: MarketingCategory) {
  const secret = requiredEnv("MAIL_UNSUBSCRIBE_SECRET");
  if (secret.length < 32) throw new DeliveryError("MAIL_UNSUBSCRIBE_SECRET must have at least 32 characters", { permanent: true });
  const expiresAt = Math.floor(Date.now() / 1_000) + 60 * 60 * 24 * 365;
  const payload = `v1.${expiresAt}.${category}.${userId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const token = `${payload}.${base64Url(new Uint8Array(signature))}`;
  return absoluteUrl(`/api/mail/unsubscribe?token=${encodeURIComponent(token)}`);
}

function cleanSenderName(value: string) {
  return value.replace(/[<>\r\n]/g, "").trim().slice(0, 80) || "ScripticX";
}

function validSenderLocalPart(value: string) {
  return /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/.test(value);
}

function validEmailHeader(value: string) {
  return !/[\r\n]/.test(value) && value.length <= 254;
}

function retryDelayMs(attempt: number) {
  return Math.min(60, Math.max(1, 2 ** Math.max(0, attempt - 1))) * 60_000;
}

async function recordFailure(admin: ReturnType<typeof createAdminClient>, row: EmailOutboxRow, error: unknown) {
  const deliveryError = error instanceof DeliveryError ? error : null;
  const terminal = deliveryError?.permanent === true || row.attempts >= row.max_attempts;
  const reason = (error instanceof Error ? error.message : "Unknown delivery error").slice(0, 500);
  const delay = Math.max(retryDelayMs(row.attempts), deliveryError?.retryAfterMs || 0);
  const { error: updateError } = await admin
    .from("email_outbox")
    .update({
      status: terminal ? "failed" : "queued",
      last_error: reason,
      available_at: new Date(Date.now() + delay).toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "processing");
  if (updateError) console.error("Could not record email failure", { id: row.id, code: updateError.code });
  return terminal ? "failed" as const : "retrying" as const;
}

function providerFailure(payload: Record<string, unknown> | null, status: number, headers: Headers) {
  const providerReason =
    (typeof payload?.message === "string" && payload.message) ||
    (typeof payload?.name === "string" && payload.name) ||
    `HTTP ${status}`;
  const errorName = typeof payload?.name === "string" ? payload.name : "";
  const retryAfterSeconds = Number(headers.get("retry-after"));
  const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1_000
    : null;
  const permanent =
    [400, 401, 403, 404, 422].includes(status) ||
    errorName === "invalid_idempotent_request";
  return new DeliveryError(`Resend delivery failed: ${providerReason.slice(0, 300)}`, {
    permanent,
    retryAfterMs,
  });
}

async function sendWithResend(message: {
  rowId: string;
  fromName: string;
  fromLocalPart: string;
  to: string;
  subject: string;
  html: string | null;
  text: string;
  replyTo: string | null;
  unsubscribeUrl: string | null;
}) {
  if (!validSenderLocalPart(message.fromLocalPart)) {
    throw new DeliveryError("Invalid sender local part", { permanent: true });
  }
  if (!validEmailHeader(message.to) || (message.replyTo && !validEmailHeader(message.replyTo))) {
    throw new DeliveryError("Invalid recipient or reply-to header", { permanent: true });
  }
  const headers: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `scripticx-email-${message.rowId}`.slice(0, 256),
      "User-Agent": "ScripticX-Email-Worker/1.0",
    },
    body: JSON.stringify({
      from: `${cleanSenderName(message.fromName)} <${message.fromLocalPart}@${MAIL_DOMAIN}>`,
      to: [message.to],
      subject: message.subject,
      ...(message.html ? { html: message.html } : {}),
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || typeof payload?.id !== "string") {
    throw providerFailure(payload, response.status, response.headers);
  }
  return payload.id;
}

async function deliverClaimedEmail(
  admin: ReturnType<typeof createAdminClient>,
  row: EmailOutboxRow,
): Promise<DeliveryOutcome> {
  try {
    const config = await getMailConfig(admin);
    const marketingCategory = row.category === "newsletter" || row.category === "product_updates"
      ? row.category
      : null;
    if (marketingCategory && !config.marketing_enabled) {
      const { error } = await admin
        .from("email_outbox")
        .update({
          status: "queued",
          attempts: Math.max(0, row.attempts - 1),
          available_at: new Date(Date.now() + 60_000).toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "retrying";
    }

    const operationalDisabled =
      (row.category === "contact" && !config.contact_notifications_enabled) ||
      (row.kind === "transactional" && !config.transactional_enabled);
    if (operationalDisabled) {
      const { error } = await admin
        .from("email_outbox")
        .update({ status: "cancelled", last_error: "Email category was disabled before delivery" })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "cancelled";
    }

    if (row.recipient_user_required && !row.recipient_user_id) {
      const { error } = await admin
        .from("email_outbox")
        .update({ status: "cancelled", last_error: "Recipient account no longer exists" })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "cancelled";
    }

    if (row.recipient_user_id) {
      const eligibility = await admin.rpc("get_email_recipient", {
        p_user_id: row.recipient_user_id,
        p_category: row.category,
      });
      if (eligibility.error) throw eligibility.error;
      const current = (eligibility.data?.[0] || null) as EmailRecipient | null;
      if (!current || current.email.toLowerCase() !== row.recipient.toLowerCase()) {
        const { error } = await admin
          .from("email_outbox")
          .update({ status: "cancelled", last_error: "Recipient is no longer eligible at this address" })
          .eq("id", row.id)
          .eq("status", "processing");
        if (error) throw error;
        return "cancelled";
      }
    }
    if (marketingCategory && !row.recipient_user_id) {
      const { error } = await admin
        .from("email_outbox")
        .update({ status: "cancelled", last_error: "Marketing email has no verified user recipient" })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "cancelled";
    }

    const unsubscribe = marketingCategory && row.recipient_user_id
      ? await unsubscribeUrl(row.recipient_user_id, marketingCategory)
      : null;
    const variables: Record<string, string> = {
      first_name:
        row.recipient_first_name ||
        row.recipient_username ||
        (row.locale === "ro" ? "prietene" : "friend"),
      username: row.recipient_username || row.recipient.split("@")[0] || "user",
      email: row.recipient,
      action_url: "",
      unsubscribe_url: unsubscribe || "",
    };
    const actionCandidate = row.action_url ? interpolate(row.action_url, variables) : "";
    const actionUrl = validActionUrl(actionCandidate);
    variables.action_url = actionUrl;
    const templated = row.kind === "campaign" || row.kind === "one_off";
    const subject = (templated ? interpolate(row.subject, variables) : row.subject)
      .replace(/[\r\n]+/g, " ")
      .slice(0, 180);
    const preheader = row.preheader
      ? (templated ? interpolate(row.preheader, variables) : row.preheader)
        .replace(/[\r\n]+/g, " ")
        .slice(0, 240)
      : null;
    const content = templated ? interpolate(row.content, variables) : row.content;
    const actionLabel = row.action_label
      ? (templated ? interpolate(row.action_label, variables) : row.action_label).slice(0, 80)
      : null;
    const senderName = cleanSenderName(row.sender_name);
    const rendered = renderEmail({
      subject,
      preheader,
      content,
      mode: row.mode,
      locale: row.locale,
      senderName,
      actionLabel,
      actionUrl: actionUrl || null,
      unsubscribeUrl: unsubscribe,
    });
    const providerSlot = await admin.rpc("consume_email_provider_rate_limit", {
      p_key: "resend",
      p_limit: 4,
      p_window_seconds: 1,
    });
    if (providerSlot.error) throw providerSlot.error;
    if (providerSlot.data !== true) {
      const { error } = await admin
        .from("email_outbox")
        .update({
          status: "queued",
          attempts: Math.max(0, row.attempts - 1),
          available_at: new Date(Date.now() + 1_250).toISOString(),
          last_error: null,
        })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "retrying";
    }

    // The shared provider gate can queue this row behind other invocations.
    // Re-check the live account address/consent once more after acquiring the
    // slot so unsubscribe, account deletion, or email change wins the race.
    if (row.recipient_user_required && !row.recipient_user_id) {
      const { error } = await admin
        .from("email_outbox")
        .update({ status: "cancelled", last_error: "Recipient account no longer exists" })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "cancelled";
    }
    if (row.recipient_user_id) {
      const latestEligibility = await admin.rpc("get_email_recipient", {
        p_user_id: row.recipient_user_id,
        p_category: row.category,
      });
      if (latestEligibility.error) throw latestEligibility.error;
      const latest = (latestEligibility.data?.[0] || null) as EmailRecipient | null;
      if (!latest || latest.email.toLowerCase() !== row.recipient.toLowerCase()) {
        const { error } = await admin
          .from("email_outbox")
          .update({ status: "cancelled", last_error: "Recipient is no longer eligible at this address" })
          .eq("id", row.id)
          .eq("status", "processing");
        if (error) throw error;
        return "cancelled";
      }
    }
    const latestConfig = await getMailConfig(admin);
    if (
      (marketingCategory && !latestConfig.marketing_enabled) ||
      (row.category === "contact" && !latestConfig.contact_notifications_enabled) ||
      (row.kind === "transactional" && !latestConfig.transactional_enabled)
    ) {
      const { error } = await admin
        .from("email_outbox")
        .update({ status: "cancelled", last_error: "Email category was disabled before delivery" })
        .eq("id", row.id)
        .eq("status", "processing");
      if (error) throw error;
      return "cancelled";
    }
    const { data: stillProcessing, error: stateError } = await admin
      .from("email_outbox")
      .select("status")
      .eq("id", row.id)
      .eq("status", "processing")
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stillProcessing) return "cancelled";
    const providerId = await sendWithResend({
      rowId: row.id,
      fromName: senderName,
      fromLocalPart: row.sender_local_part,
      to: row.recipient,
      subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: row.reply_to,
      unsubscribeUrl: unsubscribe,
    });
    const { error } = await admin
      .from("email_outbox")
      .update({
        status: "sent",
        provider_message_id: providerId,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", row.id)
      .eq("status", "processing");
    if (error) throw error;
    return "sent";
  } catch (error) {
    return recordFailure(admin, row, error);
  }
}

async function releaseUnattempted(admin: ReturnType<typeof createAdminClient>, rows: EmailOutboxRow[]) {
  await Promise.all(rows.map(async (row) => {
    const { error } = await admin
      .from("email_outbox")
      .update({
        status: "queued",
        attempts: Math.max(0, row.attempts - 1),
        available_at: new Date(Date.now() + 60_000).toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "processing");
    if (error) console.error("Could not release email claim", { id: row.id, code: error.code });
  }));
}

async function refreshCampaignStatus(admin: ReturnType<typeof createAdminClient>, campaignId: string) {
  const [campaign, sent, failed, pending] = await Promise.all([
    admin.from("email_campaigns").select("expansion_complete").eq("id", campaignId).maybeSingle(),
    admin.from("email_outbox").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent"),
    admin.from("email_outbox").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed"),
    admin.from("email_outbox").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["queued", "processing"]),
  ]);
  const queryError = campaign.error || sent.error || failed.error || pending.error;
  if (queryError) throw queryError;
  const sentCount = sent.count || 0;
  const failedCount = failed.count || 0;
  const complete = campaign.data?.expansion_complete === true && (pending.count || 0) === 0;
  const patch: Record<string, unknown> = {
    sent_count: sentCount,
    failed_count: failedCount,
  };
  if (complete) {
    patch.status = failedCount > 0 && sentCount === 0 ? "failed" : "sent";
    patch.sent_at = new Date().toISOString();
  }
  const { error } = await admin.from("email_campaigns").update(patch).eq("id", campaignId);
  if (error) throw error;
}

async function getMailConfig(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("email_config")
    .select("contact_notifications_enabled, marketing_enabled, transactional_enabled")
    .eq("id", "global")
    .single();
  if (error) throw error;
  return data as MailConfigRow;
}

async function workerHealth() {
  const admin = createAdminClient();
  const config = await getMailConfig(admin);
  requiredEnv("RESEND_API_KEY");
  const unsubscribeSecret = requiredEnv("MAIL_UNSUBSCRIBE_SECRET");
  if (unsubscribeSecret.length < 32) {
    throw new Error("MAIL_UNSUBSCRIBE_SECRET must have at least 32 characters");
  }
  return {
    ok: true,
    mode: "health" as const,
    provider: "resend",
    senderDomain: MAIL_DOMAIN,
    marketingEnabled: config.marketing_enabled,
  };
}

async function deliverOutboxRow(outboxId: string) {
  const admin = createAdminClient();
  const { data: row, error: readError } = await admin
    .from("email_outbox")
    .select("*")
    .eq("id", outboxId)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) return { found: false, sent: false, outcome: "not_found" as const };
  const current = row as EmailOutboxRow;
  if (current.status === "sent") {
    return { found: true, sent: true, outcome: "sent" as const };
  }
  if (current.status === "failed" || current.status === "cancelled") {
    return { found: true, sent: false, outcome: current.status };
  }
  if (current.status === "processing") {
    const stale = Boolean(
      current.last_attempt_at &&
      Date.parse(current.last_attempt_at) <= Date.now() - 10 * 60_000,
    );
    if (!stale) {
      return { found: true, sent: false, outcome: "processing" as const };
    }
    if (
      current.attempts >= current.max_attempts ||
      Date.parse(current.last_attempt_at || current.created_at) <=
        Date.now() - IDEMPOTENCY_SAFETY_WINDOW_MS
    ) {
      const reason = current.attempts >= current.max_attempts
        ? "Maximum delivery attempts reached"
        : "Ambiguous stale delivery requires manual review";
      const { error: failError } = await admin
        .from("email_outbox")
        .update({ status: "failed", last_error: reason })
        .eq("id", current.id)
        .eq("status", "processing");
      if (failError) throw failError;
      return { found: true, sent: false, outcome: "failed" as const };
    }
  }

  const { data: claimed, error: claimError } = await admin
    .from("email_outbox")
    .update({
      status: "processing",
      attempts: current.attempts + 1,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .in("status", current.status === "processing" ? ["processing"] : ["queued"])
    .or(
      current.status === "processing"
        ? `last_attempt_at.lte.${new Date(Date.now() - 10 * 60_000).toISOString()}`
        : `available_at.lte.${new Date().toISOString()}`,
    )
    .lt("attempts", current.max_attempts)
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) {
    const { data: latest, error: latestError } = await admin
      .from("email_outbox")
      .select("status")
      .eq("id", current.id)
      .single();
    if (latestError) throw latestError;
    return {
      found: true,
      sent: latest.status === "sent",
      outcome: latest.status === "sent" ? "sent" as const : "not_ready" as const,
    };
  }

  const claimedRow = claimed as EmailOutboxRow;
  const outcome = await deliverClaimedEmail(admin, claimedRow);
  if (claimedRow.campaign_id) await refreshCampaignStatus(admin, claimedRow.campaign_id);
  return { found: true, sent: outcome === "sent", outcome };
}

async function processEmailQueue(options: { deliveryLimit: number; expansionLimit: number }) {
  const startedAt = Date.now();
  const admin = createAdminClient();
  const config = await getMailConfig(admin);

  if (config.marketing_enabled) {
    const { error } = await admin
      .from("email_campaigns")
      .update({ status: "sending", audience_cursor: null, expansion_complete: false })
      .eq("status", "scheduled")
      .lte("schedule_at", new Date().toISOString());
    if (error) throw error;
  }

  const { data: campaigns, error: campaignError } = await admin
    .from("email_campaigns")
    .select("id")
    .eq("status", "sending")
    .eq("expansion_complete", false)
    .order("created_at", { ascending: true })
    .limit(2);
  if (campaignError) throw campaignError;

  const expandedCampaignIds: string[] = [];
  if (config.marketing_enabled) {
    for (const campaign of campaigns || []) {
      if (Date.now() - startedAt > WORKER_BUDGET_MS) break;
      const { error } = await admin.rpc("expand_email_campaign", {
        p_campaign_id: campaign.id,
        p_limit: options.expansionLimit,
      });
      if (error) throw error;
      expandedCampaignIds.push(campaign.id);
    }
  }

  const { data: claimed, error: claimError } = await admin.rpc("claim_email_outbox", {
    p_limit: options.deliveryLimit,
    p_marketing_enabled: config.marketing_enabled,
  });
  if (claimError) throw claimError;
  const rows = (claimed || []) as EmailOutboxRow[];
  const outcomes: DeliveryOutcome[] = [];
  for (let index = 0; index < rows.length; index += RESEND_WAVE_SIZE) {
    if (Date.now() - startedAt > WORKER_BUDGET_MS) {
      const unattempted = rows.slice(index);
      await releaseUnattempted(admin, unattempted);
      outcomes.push(...unattempted.map(() => "retrying" as const));
      break;
    }
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, RESEND_WAVE_DELAY_MS));
    const wave = rows.slice(index, index + RESEND_WAVE_SIZE);
    outcomes.push(...await Promise.all(
      wave.map((row) => deliverClaimedEmail(admin, row)),
    ));
  }

  const affectedCampaignIds = new Set(expandedCampaignIds);
  rows.forEach((row) => {
    if (row.campaign_id) affectedCampaignIds.add(row.campaign_id);
  });
  const { data: terminalCampaigns, error: terminalError } = await admin
    .from("email_campaigns")
    .select("id")
    .eq("status", "sending")
    .eq("expansion_complete", true)
    .order("updated_at", { ascending: true })
    .limit(50);
  if (terminalError) throw terminalError;
  terminalCampaigns?.forEach((campaign) => affectedCampaignIds.add(campaign.id));
  for (const campaignId of affectedCampaignIds) {
    if (Date.now() - startedAt > WORKER_BUDGET_MS) break;
    await refreshCampaignStatus(admin, campaignId);
  }

  return {
    campaignsExpanded: expandedCampaignIds.length,
    claimed: rows.length,
    sent: outcomes.filter((outcome) => outcome === "sent").length,
    retrying: outcomes.filter((outcome) => outcome === "retrying").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
    cancelled: outcomes.filter((outcome) => outcome === "cancelled").length,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const hasConfiguredSecret =
    (Deno.env.get("MAIL_WORKER_SECRET")?.trim().length || 0) >= 32;
  if (!hasConfiguredSecret) {
    console.error("MAIL_WORKER_SECRET is missing or too short");
    return json({ error: "Email worker is not configured" }, 503);
  }
  if (!(await workerSecretMatches(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const input = await workerRequest(request);
    if (input.mode === "health") return json(await workerHealth());
    requiredEnv("RESEND_API_KEY");
    if (input.mode === "deliver") {
      const result = await deliverOutboxRow(input.outboxId);
      return json({ ok: true, mode: "deliver", outboxId: input.outboxId, ...result });
    }
    const result = await processEmailQueue(input);
    return json({ ok: true, mode: "queue", ...result });
  } catch (error) {
    if (error instanceof DeliveryError && error.permanent) {
      return json({ error: error.message }, 400);
    }
    const message = error instanceof Error ? error.message : "Unknown worker error";
    console.error("Email worker failed", { message: message.slice(0, 500) });
    return json({ error: "Email worker failed" }, 500);
  }
});
