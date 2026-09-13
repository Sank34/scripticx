import { NextRequest, NextResponse } from "next/server";

import {
  getPlatformAccessSecret,
  PLATFORM_ACCESS_COOKIE,
  verifyPlatformAccessToken,
} from "@/lib/platformAccessToken";
import { pendingEmailVerificationCookie } from "@/lib/email-verification";

type LockdownSnapshot = {
  mode: "normal" | "maintenance" | "competition";
  freshUntil: number;
  staleUntil: number;
};

let lockdownCache: LockdownSnapshot | null = null;
let lockdownRefresh: Promise<boolean> | null = null;

const LOCKDOWN_FRESH_TTL_MS = 60_000;
const LOCKDOWN_STALE_TTL_MS = 5 * 60_000;
const LOCKDOWN_FETCH_TIMEOUT_MS = 800;

const ALWAYS_AVAILABLE = new Set([
  "/auth/callback",
  "/banned",
  "/forgot-password",
  "/lockdown",
  "/login",
  "/reset-password",
  "/api/auth/access",
  "/api/social-image",
  "/api/cron/email",
  "/api/platform/status",
  "/api/cron/competitions",
  "/api/mail/unsubscribe",
  "/api/mail/verification/resend",
]);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/monaco/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-z0-9]{2,8}$/i.test(pathname)
  );
}

function getConfiguredLockdownState() {
  const value = process.env.PLATFORM_LOCKDOWN_ENABLED?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

async function refreshLockdownState() {
  if (lockdownRefresh) return lockdownRefresh;

  lockdownRefresh = (async () => {
    const configuredState = getConfiguredLockdownState();
    if (configuredState !== null) {
      const now = Date.now();
      lockdownCache = {
        mode: configuredState ? "maintenance" : "normal",
        freshUntil: now + LOCKDOWN_FRESH_TTL_MS,
        staleUntil: now + LOCKDOWN_STALE_TTL_MS,
      };
      return configuredState;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return false;

    try {
      let response = await fetch(
        `${supabaseUrl}/rest/v1/platform_settings?id=eq.global&select=lockdown_enabled,lockdown_mode`,
        {
          cache: "no-store",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          signal: AbortSignal.timeout(LOCKDOWN_FETCH_TIMEOUT_MS),
        }
      );
      if (!response.ok) {
        response = await fetch(
          `${supabaseUrl}/rest/v1/platform_settings?id=eq.global&select=lockdown_enabled`,
          { cache: "no-store", headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, signal: AbortSignal.timeout(800) }
        );
      }
      if (!response.ok) return lockdownCache?.mode !== "normal";

      const rows = (await response.json()) as Array<{
        lockdown_enabled?: boolean;
        lockdown_mode?: "maintenance" | "competition" | null;
      }>;
      const mode = rows[0]?.lockdown_enabled === true ? (rows[0]?.lockdown_mode || "maintenance") : "normal";
      const now = Date.now();
      lockdownCache = {
        mode,
        freshUntil: now + LOCKDOWN_FRESH_TTL_MS,
        staleUntil: now + LOCKDOWN_STALE_TTL_MS,
      };
      return mode !== "normal";
    } catch {
      // A maintenance switch must not make the entire platform unavailable when
      // its backing store is temporarily slow. Keep the last known value.
      return lockdownCache?.mode !== "normal";
    }
  })().finally(() => {
    lockdownRefresh = null;
  });

  return lockdownRefresh;
}

async function readLockdownState({ allowStale }: { allowStale: boolean }) {
  const now = Date.now();
  if (lockdownCache && lockdownCache.freshUntil > now) {
    return lockdownCache.mode !== "normal";
  }

  if (allowStale && lockdownCache && lockdownCache.staleUntil > now) {
    void refreshLockdownState();
    return lockdownCache.mode !== "normal";
  }

  return refreshLockdownState();
}

async function isActiveParticipant(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return false;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/competition_participants?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=user_id&limit=1`,
      { cache: "no-store", headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, signal: AbortSignal.timeout(800) }
    );
    if (!response.ok) return false;
    const rows = (await response.json()) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicAsset(pathname) || ALWAYS_AVAILABLE.has(pathname)) {
    return NextResponse.next();
  }

  if (
    !pathname.startsWith("/api/") &&
    request.cookies.get(pendingEmailVerificationCookie)?.value === "1"
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "";
    destination.searchParams.set("verification", "pending");
    destination.searchParams.set("next", `${pathname}${search}`.slice(0, 500));
    return NextResponse.redirect(destination);
  }

  const cachedLockdown = lockdownCache?.mode !== "normal";
  if (pathname === "/") {
    const session = await verifyPlatformAccessToken(
      request.cookies.get(PLATFORM_ACCESS_COOKIE)?.value,
      getPlatformAccessSecret()
    );
    const destination = request.nextUrl.clone();
    destination.pathname = session ? "/dashboard" : "/login";
    return NextResponse.redirect(destination);
  }
  const apiRequest = pathname.startsWith("/api/");

  // Never put an external database round-trip in front of a document, App
  // Router navigation or prefetch. A known locked state is still enforced
  // instantly; otherwise the client status synchronizer performs the eventual
  // redirect while APIs keep the authoritative server-side check.
  if (!apiRequest && !cachedLockdown) {
    if (!lockdownCache || lockdownCache.freshUntil <= Date.now()) {
      void refreshLockdownState();
    }
    return NextResponse.next();
  }

  if (!(await readLockdownState({ allowStale: true }))) {
    return NextResponse.next();
  }

  const payload = await verifyPlatformAccessToken(
    request.cookies.get(PLATFORM_ACCESS_COOKIE)?.value,
    getPlatformAccessSecret()
  );
  if (payload?.role === "admin") return NextResponse.next();

  const mode = lockdownCache?.mode || "maintenance";
  let verifiedUserId = payload?.userId;
  const authorization = request.headers.get("authorization");
  if (apiRequest && authorization?.startsWith("Bearer ")) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        cache: "no-store", signal: AbortSignal.timeout(4000),
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: authorization },
      });
      const account = response.ok ? await response.json() : null;
      verifiedUserId = typeof account?.id === "string" ? account.id : undefined;
    } catch { verifiedUserId = undefined; }
  }
  if (verifiedUserId) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/platform_user_permissions`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(4000),
        headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: verifiedUserId }),
      });
      const permissions = response.ok ? await response.json() : [];
      if (Array.isArray(permissions) && permissions.includes(mode === "maintenance" ? "maintenance.bypass" : "competition.bypass")) return NextResponse.next();
    } catch { /* A failed permission lookup must not bypass lockdown. */ }
  }

  if (mode === "competition") {
    if (!(await isActiveParticipant(verifiedUserId || ""))) return NextResponse.next();
    const allowed = pathname.startsWith("/competitions") || pathname.startsWith("/docs") || pathname.startsWith("/examples") || pathname.startsWith("/api/competitions") || pathname.startsWith("/api/docs") || pathname.startsWith("/api/examples");
    if (allowed) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Platform is in competition mode" }, { status: 423 });
    const destination = request.nextUrl.clone();
    destination.pathname = "/competitions";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Platform is currently locked" },
      { status: 423 }
    );
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/lockdown";
  destination.search = "";
  destination.searchParams.set("next", `${pathname}${search}`.slice(0, 500));
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
