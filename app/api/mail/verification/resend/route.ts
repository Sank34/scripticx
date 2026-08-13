import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/metadata";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 1_000));
    if (body.locale !== undefined && body.locale !== "ro" && body.locale !== "en") {
      throw new HttpError(400, "Invalid locale");
    }
    await enforceRateLimit({
      key: user.id,
      action: "verification_email_resend",
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (!user.email || user.email_confirmed_at) {
      return NextResponse.json({ sent: true });
    }

    const locale = body.locale === "ro" ? "ro" : "en";
    const { error: metadataError } = await createAdminSupabase().auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, locale } }
    );
    if (metadataError) {
      console.error("Could not persist verification email locale:", metadataError.message);
      throw new HttpError(503, "Verification email is temporarily unavailable");
    }

    const { error } = await createServerSupabase().auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: absoluteUrl("/auth/callback?next=/dashboard"),
      },
    });
    if (error) {
      // The caller is authenticated, but provider details still remain server-only.
      console.error("Supabase verification resend failed:", error.message);
      throw new HttpError(503, "Verification email is temporarily unavailable");
    }
    return NextResponse.json({ sent: true, retryAfterSeconds: 60 });
  } catch (error) {
    if (error instanceof HttpError) {
      const isRateLimit = error.status === 429;
      return NextResponse.json(
        {
          sent: false,
          error: error.message,
          ...(isRateLimit ? { retryAfterSeconds: 60 * 60 } : {}),
        },
        { status: error.status }
      );
    }
    console.error("Verification email resend failed:", error);
    return NextResponse.json({ sent: false, error: "Could not resend verification email" }, { status: 500 });
  }
}
