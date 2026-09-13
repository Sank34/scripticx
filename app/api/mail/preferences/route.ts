import { NextResponse } from "next/server";

import {
  booleanField,
} from "@/lib/mail/validation";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PreferenceRow = {
  locale: "ro" | "en";
  newsletter: boolean;
  product_updates: boolean;
  assignments: boolean;
  competitions: boolean;
  social: boolean;
  marketing_consent_at: string | null;
};

function publicPreferences(row: PreferenceRow) {
  return {
    locale: row.locale,
    newsletter: row.newsletter,
    product_updates: row.product_updates,
    assignments: row.assignments,
    competitions: row.competitions,
    social: row.social,
  };
}

async function ensurePreferences(
  userId: string,
  locale: "ro" | "en"
) {
  const admin = createAdminSupabase();
  const { error: insertError } = await admin.from("email_preferences").upsert(
    { user_id: userId, locale },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (insertError) throw insertError;
  const { data, error } = await admin
    .from("email_preferences")
    .select("locale, newsletter, product_updates, assignments, competitions, social, marketing_consent_at")
    .eq("user_id", userId)
    .single<PreferenceRow>();
  if (error) throw error;
  return { admin, row: data };
}

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const locale = user.user_metadata?.locale === "ro" ? "ro" : "en";
    const { row } = await ensurePreferences(user.id, locale);
    return NextResponse.json({ preferences: publicPreferences(row) });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not read email preferences:", error);
    return NextResponse.json({ error: "Could not read email preferences" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      key: user.id,
      action: "email_preferences_update",
      limit: 30,
      windowSeconds: 60 * 60,
    });
    const body = jsonObject(await readJsonBody(request, 4_000));
    const initialLocale = user.user_metadata?.locale === "ro" ? "ro" : "en";
    const { admin, row } = await ensurePreferences(user.id, initialLocale);
    const patch: Record<string, unknown> = {};
    const booleanKeys = [
      "newsletter",
      "product_updates",
      "assignments",
      "competitions",
      "social",
    ] as const;
    for (const key of booleanKeys) {
      if (key in body) patch[key] = booleanField(body[key], key);
    }
    if ("locale" in body) {
      if (body.locale !== "ro" && body.locale !== "en") {
        throw new HttpError(400, "Invalid email locale");
      }
      patch.locale = body.locale;
    }
    if (!Object.keys(patch).length) throw new HttpError(400, "No preferences to update");

    const nextNewsletter = typeof patch.newsletter === "boolean"
      ? patch.newsletter
      : row.newsletter;
    const nextProductUpdates = typeof patch.product_updates === "boolean"
      ? patch.product_updates
      : row.product_updates;
    if (nextNewsletter || nextProductUpdates) {
      if (!row.marketing_consent_at) {
        patch.marketing_consent_at = new Date().toISOString();
        patch.marketing_consent_source = "settings";
      }
      patch.marketing_unsubscribed_at = null;
    } else if ("newsletter" in patch || "product_updates" in patch) {
      patch.marketing_unsubscribed_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("email_preferences")
      .update(patch)
      .eq("user_id", user.id)
      .select("locale, newsletter, product_updates, assignments, competitions, social, marketing_consent_at")
      .single<PreferenceRow>();
    if (error) throw error;
    return NextResponse.json({ preferences: publicPreferences(data) });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update email preferences:", error);
    return NextResponse.json({ error: "Could not update email preferences" }, { status: 500 });
  }
}
