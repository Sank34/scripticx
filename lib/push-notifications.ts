import "server-only";

import { createAdminSupabase } from "@/lib/supabaseServer";

type ClaimedPush = {
  outbox_id: string;
  device_id: string;
  expo_push_token: string;
  notification_id: string;
  notification_type: string;
  title: string;
  body: string;
  href: string;
  metadata: Record<string, unknown> | null;
  unread_count: number;
  attempts: number;
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | {
      status: "error";
      message?: string;
      details?: { error?: string };
    };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function retryDelayMinutes(attempts: number) {
  return Math.min(60, Math.max(1, 2 ** Math.max(0, attempts - 1)));
}

export async function deliverQueuedPushNotifications(limit = 100) {
  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("claim_notification_push_batch", {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) {
    // This lets the app deploy before the additive migration is applied.
    if (error.code === "42883" || error.code === "PGRST202") {
      return { claimed: 0, delivered: 0, failed: 0, unavailable: true };
    }
    throw error;
  }

  const claimed = (data || []) as ClaimedPush[];
  if (!claimed.length) {
    return { claimed: 0, delivered: 0, failed: 0, unavailable: false };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  let tickets: ExpoPushTicket[];
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(
        claimed.map((item) => ({
          to: item.expo_push_token,
          sound: "default",
          title: item.title,
          body: item.body,
          badge: Math.max(0, Number(item.unread_count) || 0),
          data: {
            notificationId: item.notification_id,
            type: item.notification_type,
            href: item.href,
            metadata: item.metadata || {},
          },
        }))
      ),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Expo push gateway returned ${response.status}`);
    }
    const payload = (await response.json()) as { data?: ExpoPushTicket[] };
    tickets = payload.data || [];
  } catch (pushError) {
    const message = pushError instanceof Error ? pushError.message : "Push gateway unavailable";
    await Promise.all(
      claimed.map((item) =>
        admin
          .from("notification_push_outbox")
          .update({
            status: item.attempts >= 5 ? "failed" : "pending",
            available_at: new Date(
              Date.now() + retryDelayMinutes(item.attempts) * 60_000
            ).toISOString(),
            locked_at: null,
            last_error: message.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.outbox_id)
      )
    );
    throw pushError;
  }

  let delivered = 0;
  let failed = 0;
  await Promise.all(
    claimed.map(async (item, index) => {
      const ticket = tickets[index];
      if (ticket?.status === "ok") {
        delivered += 1;
        await admin
          .from("notification_push_outbox")
          .update({
            status: "sent",
            expo_ticket_id: ticket.id,
            delivered_at: new Date().toISOString(),
            locked_at: null,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.outbox_id);
        return;
      }

      failed += 1;
      const reason =
        ticket?.status === "error"
          ? ticket.details?.error || ticket.message || "Expo rejected the notification"
          : "Expo returned no ticket";
      const unregistered =
        ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered";
      if (unregistered) {
        await admin
          .from("notification_push_devices")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", item.device_id);
      }
      await admin
        .from("notification_push_outbox")
        .update({
          status: unregistered || item.attempts >= 5 ? "failed" : "pending",
          available_at: new Date(
            Date.now() + retryDelayMinutes(item.attempts) * 60_000
          ).toISOString(),
          locked_at: null,
          last_error: reason.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.outbox_id);
    })
  );

  return {
    claimed: claimed.length,
    delivered,
    failed,
    unavailable: false,
  };
}
