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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = jsonObject(await readJsonBody(request, 3_000));
    const email = stringField(body.email, { max: 254, min: 3 }).toLowerCase();
    const password = stringField(body.password, {
      max: 128,
      min: 8,
      trim: false,
      tooShortMessage: "Password must contain at least 8 characters",
    });
    const locale = body.locale === "ro" ? "ro" : "en";
    if (!emailPattern.test(email)) throw new HttpError(400, "Invalid email address");

    const emailKey = createHash("sha256").update(email).digest("hex");
    await Promise.all([
      enforceRateLimit({
        action: "mobile_signup_ip",
        key: requestIpKey(request),
        limit: 8,
        windowSeconds: 60 * 60,
      }),
      enforceRateLimit({
        action: "mobile_signup_email",
        key: emailKey,
        limit: 4,
        windowSeconds: 60 * 60,
      }),
    ]);

    const rawMetadata = jsonObject(body.metadata);
    const metadata = {
      locale,
      scripticx_default_language: locale,
      scripticx_language_updated_at: Date.now(),
      scripticx_mobile_onboarding_required: true,
      ...(typeof rawMetadata.preferred_username === "string"
        ? { preferred_username: rawMetadata.preferred_username.slice(0, 50) }
        : {}),
    };
    const admin = createAdminSupabase();
    const { data: linkResult, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: metadata,
        redirectTo: absoluteUrl("/auth/callback?flow=verification"),
      },
    });
    const actionLink = linkResult.properties?.action_link;
    const user = linkResult.user;
    if (linkError || !actionLink || !user) {
      const alreadyRegistered = /already|registered|exists/i.test(linkError?.message ?? "");
      console.error("Could not create mobile signup link:", {
        code: linkError?.code,
        message: linkError?.message,
      });
      throw new HttpError(
        alreadyRegistered ? 409 : 503,
        alreadyRegistered
          ? "An account already exists for this email"
          : "The account could not be created"
      );
    }

    try {
      await sendMobileVerificationEmail({
        actionLink,
        email,
        locale,
        userId: user.id,
      });
      return NextResponse.json(
        {
          created: true,
          emailSent: true,
          needsEmailVerification: true,
          retryAfterSeconds: 60,
          userId: user.id,
        },
        { status: 201 }
      );
    } catch (deliveryError) {
      const message = deliveryError instanceof Error
        ? deliveryError.message
        : "The confirmation email could not be delivered";
      return NextResponse.json(
        {
          created: true,
          emailSent: false,
          error: message,
          needsEmailVerification: true,
          retryAfterSeconds: 60,
          userId: user.id,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          created: false,
          error: error.message,
          ...(error.status === 429 ? { retryAfterSeconds: 60 * 60 } : {}),
        },
        { status: error.status }
      );
    }
    console.error("Mobile signup failed:", error);
    return NextResponse.json(
      { created: false, error: "The account could not be created" },
      { status: 500 }
    );
  }
}
