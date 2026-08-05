import { NextResponse } from "next/server";

import {
  getPlatformAccessSecret,
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_ACCESS_TTL_SECONDS,
  signPlatformAccessToken,
} from "@/lib/platformAccessToken";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { HttpError } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // This endpoint must remain reachable during lockdown so an authenticated
    // admin can receive the short-lived server-verified navigation cookie.
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new HttpError(401, "Authentication required");
    }

    const accessToken = authorization.slice("Bearer ".length).trim();
    const authClient = createAdminSupabase();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);
    if (userError || !user) throw new HttpError(401, "Invalid session");

    const [{ data: profile, error: profileError }, { data: settings, error: settingsError }] =
      await Promise.all([
        authClient
          .from("profiles")
          .select("role, banned")
          .eq("id", user.id)
          .maybeSingle<{ role: string | null; banned: boolean | null }>(),
        authClient
          .from("platform_settings")
          .select("lockdown_enabled, lockdown_message")
          .eq("id", "global")
          .maybeSingle<{
            lockdown_enabled: boolean;
            lockdown_message: string;
          }>(),
      ]);

    if (profileError || !profile || profile.banned) {
      throw new HttpError(403, "Profile access denied");
    }
    const settingsUnavailable =
      settingsError?.code === "42P01" || settingsError?.code === "PGRST205";
    if (settingsError && !settingsUnavailable) throw settingsError;

    const role = profile.role || "user";
    const secret = getPlatformAccessSecret();
    if (!secret) throw new HttpError(503, "Access signing is not configured");

    const token = await signPlatformAccessToken(
      {
        exp: Math.floor(Date.now() / 1000) + PLATFORM_ACCESS_TTL_SECONDS,
        role,
        userId: user.id,
      },
      secret
    );

    const response = NextResponse.json({
      lockdownEnabled: settings?.lockdown_enabled || false,
      lockdownMessage: settings?.lockdown_message || null,
      role,
    });
    response.cookies.set(PLATFORM_ACCESS_COOKIE, token, {
      httpOnly: true,
      maxAge: PLATFORM_ACCESS_TTL_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Platform access synchronization failed:", error);
    return NextResponse.json({ error: "Could not verify platform access" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.set(PLATFORM_ACCESS_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
