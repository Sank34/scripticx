import "server-only";

import { HttpError } from "@/lib/server/requestSecurity";

const WORKER_NAME = "email-worker";
const DEFAULT_TIMEOUT_MS = 15_000;

export type EmailWorkerQueueResult = {
  ok: true;
  mode: "queue";
  campaignsExpanded: number;
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
  cancelled: number;
};

export type EmailWorkerHealth = {
  ok: true;
  mode: "health";
  provider: "resend";
  senderDomain: "scripticx.org";
  marketingEnabled: boolean;
};

export type EmailWorkerDeliveryResult = {
  ok: true;
  mode: "deliver";
  outboxId: string;
  found: boolean;
  sent: boolean;
  outcome:
    | "sent"
    | "retrying"
    | "failed"
    | "cancelled"
    | "processing"
    | "not_ready"
    | "not_found";
};

type EmailWorkerRequest =
  | { mode: "health" }
  | { mode: "deliver"; outboxId: string }
  | { mode: "queue"; deliveryLimit?: number; expansionLimit?: number };

type WorkerPayload = { error?: unknown; ok?: unknown; mode?: unknown };

function workerConfiguration() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const workerSecret = process.env.MAIL_WORKER_SECRET?.trim();
  if (!baseUrl || !workerSecret || workerSecret.length < 32) return null;
  return {
    endpoint: `${baseUrl}/functions/v1/${WORKER_NAME}`,
    workerSecret,
  };
}

export function isEmailWorkerConfigured() {
  return workerConfiguration() !== null;
}

function statusForWorkerFailure(status: number) {
  if (status === 400) return 400;
  if (status === 401 || status === 403) return 503;
  if (status === 429) return 429;
  if (status === 503) return 503;
  return 502;
}

export async function invokeEmailWorker<T>(
  body: EmailWorkerRequest,
  options: { timeoutMs?: number } = {}
): Promise<T> {
  const configuration = workerConfiguration();
  if (!configuration) throw new HttpError(503, "Email worker is not configured");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-scripticx-worker-secret": configuration.workerSecret,
  };
  let response: Response;
  try {
    response = await fetch(configuration.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs || DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Could not reach Supabase email worker:", error);
    throw new HttpError(502, "Email worker is unavailable");
  }

  const payload = (await response.json().catch(() => null)) as WorkerPayload | null;
  if (!response.ok) {
    const providerMessage = typeof payload?.error === "string" ? payload.error : null;
    throw new HttpError(
      statusForWorkerFailure(response.status),
      providerMessage === "Unauthorized"
        ? "Email worker credentials are invalid"
        : providerMessage || "Email worker request failed"
    );
  }
  if (!payload || payload.ok !== true || payload.mode !== body.mode) {
    throw new HttpError(502, "Email worker returned an invalid response");
  }
  return payload as T;
}

export function getEmailWorkerHealth() {
  return invokeEmailWorker<EmailWorkerHealth>({ mode: "health" }, { timeoutMs: 8_000 });
}

export async function isEmailWorkerReady() {
  if (!isEmailWorkerConfigured()) return false;
  try {
    await getEmailWorkerHealth();
    return true;
  } catch (error) {
    console.error("Supabase email worker health check failed:", error);
    return false;
  }
}

export function deliverEmailWithWorker(outboxId: string) {
  return invokeEmailWorker<EmailWorkerDeliveryResult>(
    { mode: "deliver", outboxId },
    { timeoutMs: 20_000 }
  );
}

export function processEmailQueueWithWorker(
  options: { deliveryLimit?: number; expansionLimit?: number } = {}
) {
  return invokeEmailWorker<EmailWorkerQueueResult>(
    { mode: "queue", ...options },
    { timeoutMs: 55_000 }
  );
}
