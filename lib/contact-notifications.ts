import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmailRecipient } from "@/lib/mail/types";
import { stableEventKey } from "@/lib/server/requestSecurity";

type ContactNotificationInput = {
  contactId: string;
  name: string;
  topic: string;
  userId?: string | null;
  locale: "ro" | "en";
};

export async function createContactSubmittedNotifications(
  admin: SupabaseClient,
  input: ContactNotificationInput
) {
  const { data, error } = await admin.rpc("get_admin_email_recipients");
  if (error) throw error;

  const admins = (data || []) as EmailRecipient[];
  const adminRows = admins.map((recipient) => {
    const ro = recipient.locale === "ro";
    return {
      user_id: recipient.user_id,
      actor_id: input.userId || null,
      type: "contact_message",
      title: ro ? "Mesaj de contact nou" : "New contact message",
      body: ro
        ? `${input.name} a trimis un mesaj despre ${input.topic}.`
        : `${input.name} sent a message about ${input.topic}.`,
      href: "/admin/contact",
      metadata: {
        contactId: input.contactId,
        contactName: input.name,
        topic: input.topic,
      },
      dedupe_key: stableEventKey({
        type: "contact_message",
        contactId: input.contactId,
        recipientId: recipient.user_id,
      }),
    };
  });

  const submitterRow = input.userId
    ? [{
        user_id: input.userId,
        actor_id: null,
        type: "contact_received",
        title: input.locale === "ro" ? "Mesaj primit" : "Message received",
        body: input.locale === "ro"
          ? "Solicitarea ta a fost înregistrată. Vei primi răspunsul pe email."
          : "Your request was registered. The reply will be sent by email.",
        href: "/contact",
        metadata: { contactId: input.contactId, topic: input.topic },
        dedupe_key: stableEventKey({
          type: "contact_received",
          contactId: input.contactId,
          recipientId: input.userId,
        }),
      }]
    : [];

  const rows = [...adminRows, ...submitterRow];
  if (!rows.length) return 0;

  const result = await admin.from("notifications").upsert(rows, {
    onConflict: "dedupe_key",
    ignoreDuplicates: true,
  });
  if (result.error) throw result.error;
  return rows.length;
}
