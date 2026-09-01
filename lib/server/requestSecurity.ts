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

// ======= FUNCTIONS =======

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireUser(request: Request): Promise<{
  user: User;
  accessToken: string;
  role: string;
}> {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new HttpError(401, "Authentication required");

  const client = createServerSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) throw new HttpError(401, "Invalid session");

  const admin = createAdminSupabase();
  const [{ data: profile, error: profileError }, { data: settings, error: settingsError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("role, banned")
        .eq("id", user.id)
        .maybeSingle<{ role: string | null; banned: boolean | null }>(),
      admin
        .from("platform_settings")
        .select("lockdown_enabled")
        .eq("id", "global")
        .maybeSingle<{ lockdown_enabled: boolean }>(),
    ]);

  if (profileError || !profile) {
    console.error("Could not verify authenticated profile:", profileError);
    throw new HttpError(403, "Profile access denied");
  }
  if (profile.banned) throw new HttpError(403, "Account is banned");

  const settingsUnavailable =
    settingsError?.code === "42P01" || settingsError?.code === "PGRST205";
  if (settingsError && !settingsUnavailable) {
    console.error("Could not verify platform status:", settingsError);
    throw new HttpError(503, "Platform access service unavailable");
  }

  const role = profile.role || "user";
  if (settings?.lockdown_enabled && role !== "admin") {
    throw new HttpError(423, "Platform is currently locked");
  }

  return { user, accessToken, role };
}

export async function requireAdmin(request: Request) {
  const session = await requireUser(request);
  if (session.role !== "admin") throw new HttpError(403, "Admin access required");
  return session;
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
    // Failing closed is important for endpoints that mint points or messages
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
  options: {
    min?: number;
    max: number;
    trim?: boolean;
    invalidTypeMessage?: string;
    tooShortMessage?: string;
    tooLongMessage?: string;
  }
) {
  if (typeof value !== "string") {
    throw new HttpError(400, options.invalidTypeMessage || "Invalid request");
  }
  const text = options.trim === false ? value : value.trim();
  if (text.length < (options.min || 0)) {
    throw new HttpError(400, options.tooShortMessage || "Invalid request");
  }
  if (text.length > options.max) {
    throw new HttpError(400, options.tooLongMessage || "Invalid request");
  }
  return text;
}
