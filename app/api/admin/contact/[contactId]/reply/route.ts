import { NextResponse } from "next/server";

import { getMailConfig, queueEmail, rollingMailDedupeKey } from "@/lib/mail/service";
import { SCRIPTICX_MAIL_DOMAIN } from "@/lib/mail/types";
import {
  emailAddress,
  mailContent,
  mailMode,
  mailSubject,
  senderLocalPart,
  senderName,
} from "@/lib/mail/validation";
import { deliverEmailWithWorker, isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stableEventKey,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ContactRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  topic: string;
  status: "new" | "read" | "resolved";
};

export async function POST(
  request: Request,
  context: { params: Promise<{ contactId: string }> }
) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({
      key: user.id,
      action: "contact_reply_send",
      limit: 40,
      windowSeconds: 60 * 60,
    });

    if (!isEmailWorkerConfigured()) {
      throw new HttpError(503, "Email worker is not configured");
    }

    const { contactId } = await context.params;
    const id = stringField(contactId, { min: 1, max: 100 });
    const body = jsonObject(await readJsonBody(request, 32_000));
    const subject = mailSubject(body.subject);
    const content = mailContent(body.content);
    const locale = body.locale === "ro" ? "ro" : "en";
    const mode = mailMode(body.mode, "html");
    const fromName = senderName(body.senderName ?? "ScripticX Support");
    const fromLocalPart = senderLocalPart(body.senderLocalPart ?? "support");

    const admin = createAdminSupabase();
    const [{ data: contact, error: contactError }, config] = await Promise.all([
      admin
        .from("contact_messages")
        .select("id, user_id, name, email, topic, status")
        .eq("id", id)
        .maybeSingle<ContactRow>(),
      getMailConfig(admin),
    ]);

    if (contactError) throw contactError;
    if (!contact) throw new HttpError(404, "Contact message not found");
    if (!config.transactional_enabled || !config.contact_notifications_enabled) {
      throw new HttpError(503, "Contact email is disabled");
    }

    const recipient = emailAddress(contact.email)!;
    const replyTo = `${fromLocalPart}@${SCRIPTICX_MAIL_DOMAIN}`;
    const dedupeKey = await rollingMailDedupeKey({
      scope: `contact-reply:${contact.id}`,
      payload: {
        actor: user.id,
        recipient,
        subject,
        content,
        locale,
        mode,
        fromName,
        fromLocalPart,
      },
      windowMs: 2 * 60_000,
      admin,
    });

    const firstName = contact.name.trim().split(/\s+/)[0] || contact.name;
    const row = await queueEmail(
      {
        recipient,
        // Guest and registered contact requests share the same delivery path.
        // The account id remains available for the in-app notification below.
        recipientUserId: null,
        recipientFirstName: firstName,
        recipientUsername: firstName,
        locale,
        kind: "one_off",
        category: "contact",
        subject,
        preheader: content.replace(/\s+/g, " ").trim().slice(0, 200),
        content,
        mode,
        senderName: fromName,
        senderLocalPart: fromLocalPart,
        replyTo,
        dedupeKey,
      },
      admin
    );

    const delivered = row.status === "sent"
      ? true
      : (await deliverEmailWithWorker(row.id)).sent;
    if (!delivered) throw new HttpError(502, "Reply could not be delivered");

    const { error: statusError } = await admin
      .from("contact_messages")
      .update({ status: "resolved" })
      .eq("id", contact.id);
    if (statusError) {
      console.error("Contact reply sent, but status could not be updated:", statusError);
    }

    if (contact.user_id) {
      const notification = {
        user_id: contact.user_id,
        actor_id: user.id,
        type: "contact_reply",
        title: locale === "ro" ? "Ai primit un răspuns" : "You received a reply",
        body: locale === "ro"
          ? `Echipa ScripticX a răspuns solicitării tale despre ${contact.topic}.`
          : `The ScripticX team replied to your request about ${contact.topic}.`,
        href: "/contact",
        metadata: {
          contactId: contact.id,
          senderAddress: replyTo,
          topic: contact.topic,
        },
        dedupe_key: stableEventKey({
          type: "contact_reply",
          contactId: contact.id,
          outboxId: row.id,
        }),
      };
      const { error: notificationError } = await admin
        .from("notifications")
        .upsert(notification, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (notificationError) {
        console.error("Contact reply sent, but notification could not be created:", notificationError);
      }
    }

    return NextResponse.json({
      sent: true,
      sender: replyTo,
      status: statusError ? contact.status : "resolved",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not reply to contact message:", error);
    return NextResponse.json({ error: "Could not send contact reply" }, { status: 500 });
  }
}
