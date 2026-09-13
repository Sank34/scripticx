import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { sendMobileVerificationEmail } from "@/lib/mail/mobileVerification";
import { absoluteUrl } from "@/lib/metadata";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requestIpKey,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = jsonObject(await readJsonBody(request, 1_500));
    const userId = stringField(body.userId, { max: 64, min: 36 });
    const email = stringField(body.email, { max: 254, min: 3 }).toLowerCase();
    const locale = body.locale === "ro" ? "ro" : "en";
    if (!userIdPattern.test(userId) || !emailPattern.test(email)) {
      throw new HttpError(400, "Invalid confirmation request");
    }

    const emailKey = createHash("sha256").update(email).digest("hex");
    await Promise.all([
      enforceRateLimit({
        action: "mobile_confirmation_ip",
        key: requestIpKey(request),
        limit: 8,
        windowSeconds: 60 * 60,
      }),
      enforceRateLimit({
        action: "mobile_confirmation_user",
        key: `${userId}:${emailKey}`,
        limit: 4,
        windowSeconds: 60 * 60,
      }),
    ]);

    const admin = createAdminSupabase();
    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
    const user = userResult.user;
    if (userError || !user || user.email?.toLowerCase() !== email) {
      throw new HttpError(404, "The pending account could not be found");
    }
    if (user.email_confirmed_at) {
      return NextResponse.json({ sent: true, alreadyConfirmed: true });
    }

    const { data: linkResult, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: absoluteUrl("/auth/callback?flow=verification"),
      },
    });
    const actionLink = linkResult.properties?.action_link;
    if (linkError || !actionLink) {
      console.error("Could not generate mobile verification link:", linkError?.message);
      throw new HttpError(503, "The confirmation link could not be generated");
    }

    await sendMobileVerificationEmail({ actionLink, email, locale, userId });
    return NextResponse.json({ sent: true, retryAfterSeconds: 60 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          sent: false,
          error: error.message,
          ...(error.status === 429 ? { retryAfterSeconds: 60 * 60 } : {}),
        },
        { status: error.status }
      );
    }
    console.error("Mobile verification email failed:", error);
    return NextResponse.json(
      { sent: false, error: "Could not send the confirmation email" },
      { status: 500 }
    );
  }
}
