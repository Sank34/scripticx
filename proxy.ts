import { NextRequest, NextResponse } from "next/server";

import {
  getPlatformAccessSecret,
  PLATFORM_ACCESS_COOKIE,
  verifyPlatformAccessToken,
} from "@/lib/platformAccessToken";

type LockdownSnapshot = {
  enabled: boolean;
  expiresAt: number;
};

let lockdownCache: LockdownSnapshot | null = null;

const ALWAYS_AVAILABLE = new Set([
  "/auth/callback",
  "/banned",
  "/forgot-password",
  "/lockdown",
  "/login",
  "/reset-password",
  "/api/auth/access",
  "/api/platform/status",
  "/api/cron/competitions",
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

async function readLockdownState() {
  const now = Date.now();
  if (lockdownCache && lockdownCache.expiresAt > now) {
    return lockdownCache.enabled;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return false;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/platform_settings?id=eq.global&select=lockdown_enabled`,
      {
        cache: "no-store",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: AbortSignal.timeout(2_500),
      }
    );
    if (!response.ok) return lockdownCache?.enabled || false;
    const rows = (await response.json()) as Array<{ lockdown_enabled?: boolean }>;
    const enabled = rows[0]?.lockdown_enabled === true;
    lockdownCache = { enabled, expiresAt: now + 5_000 };
    return enabled;
  } catch {
    // Preserve the last known locked state during a temporary database outage.
    return lockdownCache?.enabled || false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicAsset(pathname) || ALWAYS_AVAILABLE.has(pathname)) {
    return NextResponse.next();
  }

  if (!(await readLockdownState())) return NextResponse.next();

  const payload = await verifyPlatformAccessToken(
    request.cookies.get(PLATFORM_ACCESS_COOKIE)?.value,
    getPlatformAccessSecret()
  );
  if (payload?.role === "admin") return NextResponse.next();

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
