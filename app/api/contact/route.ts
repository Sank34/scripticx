import { NextResponse } from "next/server";

import { createAdminSupabase, createServerSupabase } from "@/lib/supabaseServer";
import {
  enforceRateLimit,
  getBearerToken,
  HttpError,
  jsonObject,
  requestIpKey,
  readJsonBody,
  stringField,
} from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOPICS = new Set(["bug", "feature", "account", "feedback", "other"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = jsonObject(await readJsonBody(request, 8_000));
    const admin = createAdminSupabase();
    const token = getBearerToken(request);
    let userId: string | null = null;
    let verifiedEmail: string | null = null;
    let verifiedName: string | null = null;

    if (token) {
      const authClient = createServerSupabase();
      const {
        data: { user },
      } = await authClient.auth.getUser(token);

      if (user) {
        userId = user.id;
        verifiedEmail = user.email || null;
        const { data: profile } = await admin
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle<{ username: string | null }>();
        verifiedName = profile?.username || null;
      }
    }

    const rateKey = userId ? `user:${userId}` : `ip:${requestIpKey(request)}`;
    await enforceRateLimit({
      key: rateKey,
      action: "contact_submit",
      limit: 5,
      windowSeconds: 60 * 60,
    });

    const name = verifiedName || stringField(body.name, { min: 2, max: 80 });
    const email = (
      verifiedEmail || stringField(body.email, { min: 5, max: 254 })
    ).toLowerCase();
    const topic = stringField(body.topic, { min: 2, max: 30 });
    const description = stringField(body.description, { min: 10, max: 5_000 });

    if (!EMAIL_PATTERN.test(email) || !TOPICS.has(topic)) {
      throw new HttpError(400, "Invalid contact message");
    }

    const { error } = await admin.from("contact_messages").insert({
      user_id: userId,
      name,
      email,
      topic,
      description,
    });
    if (error) throw error;

    return NextResponse.json({ submitted: true }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Contact submission failed:", error);
    return NextResponse.json({ error: "Could not submit message" }, { status: 500 });
  }
}
