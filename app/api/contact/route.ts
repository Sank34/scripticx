import { NextResponse } from "next/server";

import { createContactSubmittedNotifications } from "@/lib/contact-notifications";
import {
  queueContactAcknowledgementEmail,
  queueContactAdminEmails,
} from "@/lib/mail/service";
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

    const name = verifiedName || stringField(body.name, {
      min: 2,
      max: 80,
      tooShortMessage: "Please enter your name.",
      tooLongMessage: "That name is too long.",
    });
    const email = (
      verifiedEmail || stringField(body.email, {
        min: 5,
        max: 254,
        tooShortMessage: "Please enter a valid email address.",
        tooLongMessage: "That email address is too long.",
      })
    ).toLowerCase();
    const topic = stringField(body.topic, {
      min: 2,
      max: 30,
      tooShortMessage: "Please select a topic.",
    });
    const description = stringField(body.description, {
      min: 10,
      max: 5_000,
      tooShortMessage: "Your message is too short! Tell us a bit more.",
      tooLongMessage: "Your message is too long. Please keep it under 5,000 characters.",
    });
    const locale = body.locale === "ro" ? "ro" : "en";

    if (!EMAIL_PATTERN.test(email)) {
      throw new HttpError(400, "Please enter a valid email address.");
    }
    if (!TOPICS.has(topic)) {
      throw new HttpError(400, "Please select a valid topic.");
    }

    const { data: contact, error } = await admin
      .from("contact_messages")
      .insert({
        user_id: userId,
        name,
        email,
        topic,
        description,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;

    let confirmationQueued = false;
    const mailResults = await Promise.allSettled([
      queueContactAdminEmails({
        contactId: contact.id,
        name,
        email,
        topic,
        description,
      }),
      queueContactAcknowledgementEmail({
        contactId: contact.id,
        name,
        email,
        topic,
        locale,
      }),
    ]);
    confirmationQueued =
      mailResults[1]?.status === "fulfilled" && mailResults[1].value === true;
    mailResults.forEach((result) => {
      if (result.status !== "rejected") return;
      // Contact persistence is authoritative; an email outage must never make
      // the user retry and create a duplicate contact message.
      console.error("Could not queue contact email:", result.reason);
    });

    try {
      await createContactSubmittedNotifications(admin, {
        contactId: contact.id,
        name,
        topic,
        userId,
        locale,
      });
    } catch (notificationError) {
      console.error("Could not create contact notifications:", notificationError);
    }

    return NextResponse.json(
      {
        submitted: true,
        confirmationQueued,
        reference: contact.id.slice(0, 8).toUpperCase(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Contact submission failed:", error);
    return NextResponse.json({ error: "Could not submit message" }, { status: 500 });
  }
}
