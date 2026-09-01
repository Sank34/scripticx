import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  getBearerToken,
  HttpError,
  jsonObject,
  readJsonBody,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupportedLocale = "en" | "ro";
type LanguagePreferenceRow = {
  applied: boolean;
  locale: SupportedLocale | null;
  revision: number;
  updated_at: string | null;
};

async function requireLanguageUser(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new HttpError(401, "Authentication required");

  const {
    data: { user },
    error,
  } = await createServerSupabase().auth.getUser(accessToken);

  if (error || !user) throw new HttpError(401, "Invalid session");
  return user;
}

function userLocale(userMetadata: Record<string, unknown> | undefined): SupportedLocale | null {
  const preferred = userMetadata?.scripticx_default_language;
  if (preferred === "ro" || preferred === "en") return preferred;
  const legacy = userMetadata?.locale;
  return legacy === "ro" || legacy === "en" ? legacy : null;
}

export async function GET(request: Request) {
  try {
    const user = await requireLanguageUser(request);
    const { data, error } = await createAdminSupabase()
      .from("user_language_preferences")
      .select("locale, revision, updated_at")
      .eq("user_id", user.id)
      .maybeSingle<Pick<LanguagePreferenceRow, "locale" | "revision" | "updated_at">>();
    if (error) throw error;

    return NextResponse.json({
      locale: data?.locale ?? userLocale(user.user_metadata),
      revision: data?.revision ?? 0,
      updatedAt: data?.updated_at ?? null,
      userId: user.id,
    });
  } catch (error) {
    return languageErrorResponse(error, "Could not read language preference");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireLanguageUser(request);
    await enforceRateLimit({
      action: "language_preference_update",
      key: user.id,
      limit: 120,
      windowSeconds: 60 * 60,
    });
    const body = jsonObject(await readJsonBody(request, 512));
    if (body.locale !== "en" && body.locale !== "ro") {
      throw new HttpError(400, "Invalid language");
    }
    if (
      typeof body.expectedRevision !== "number" ||
      !Number.isSafeInteger(body.expectedRevision) ||
      body.expectedRevision < 0
    ) {
      throw new HttpError(400, "Invalid language revision");
    }

    const { data, error } = await createAdminSupabase()
      .rpc("set_user_language_preference", {
        p_expected_revision: body.expectedRevision,
        p_locale: body.locale,
        p_user_id: user.id,
      })
      .single<LanguagePreferenceRow>();
    if (error || !data) {
      console.error("Could not persist language preference:", error?.message);
      throw new HttpError(503, "Language preference is temporarily unavailable");
    }

    const payload = {
      locale: data.locale,
      revision: data.revision,
      updatedAt: data.updated_at,
      userId: user.id,
    };
    if (!data.applied) {
      return NextResponse.json(
        { ...payload, error: "Language preference changed on another client" },
        { status: 409 }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return languageErrorResponse(error, "Could not update language preference");
  }
}

function languageErrorResponse(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
