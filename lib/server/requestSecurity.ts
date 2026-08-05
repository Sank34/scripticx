import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabaseServer";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireUser(request: Request): Promise<{
  user: User;
  accessToken: string;
}> {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new HttpError(401, "Authentication required");

  const client = createServerSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) throw new HttpError(401, "Invalid session");
  return { user, accessToken };
}

export function requestIpKey(request: Request) {
  const rawIp =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "scripticx";
  return createHmac("sha256", secret).update(rawIp).digest("hex");
}

export async function readJsonBody(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, "Request body is too large");
  }

  if (!request.body) throw new HttpError(400, "Invalid request");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let source = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request body is too large");
    }
    source += decoder.decode(value, { stream: true });
  }
  source += decoder.decode();

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new HttpError(400, "Invalid request");
  }
}

export function stableEventKey(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 32);
}

export async function enforceRateLimit(input: {
  key: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("consume_security_rate_limit", {
    p_key: input.key,
    p_action: input.action,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error) {
    // Failing closed is important for endpoints that mint points or messages.
    console.error("Security rate limiter failed:", error);
    throw new HttpError(503, "Security service unavailable");
  }

  if (data !== true) throw new HttpError(429, "Too many requests");
}

export function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function stringField(
  value: unknown,
  options: { min?: number; max: number; trim?: boolean }
) {
  if (typeof value !== "string") throw new HttpError(400, "Invalid request");
  const text = options.trim === false ? value : value.trim();
  if (text.length < (options.min || 0) || text.length > options.max) {
    throw new HttpError(400, "Invalid request");
  }
  return text;
}
