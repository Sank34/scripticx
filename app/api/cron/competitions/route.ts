import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { queueNotificationEmail } from "@/lib/mail/service";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LiveCompetition = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  reminder_interval_minutes: number;
};

function formatRemaining(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Competition cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabase();
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: competitions, error } = await admin
      .from("competitions")
      .select("id, name, starts_at, ends_at, reminder_interval_minutes")
      .eq("status", "published")
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso)
      .returns<LiveCompetition[]>();
    if (error) throw error;

    let delivered = 0;
    for (const competition of competitions || []) {
      const interval = Math.max(5, competition.reminder_interval_minutes || 30);
      const elapsedMinutes = Math.floor(
        (now.getTime() - Date.parse(competition.starts_at)) / 60_000
      );
      const slot = Math.floor(elapsedMinutes / interval);
      if (slot < 1) continue;

      const remainingMinutes = Math.max(
        1,
        Math.ceil((Date.parse(competition.ends_at) - now.getTime()) / 60_000)
      );
      const reminderKey = `slot-${slot}`;
      const { data: participants, error: participantError } = await admin
        .from("competition_participants")
        .select("user_id")
        .eq("competition_id", competition.id)
        .eq("status", "active");
      if (participantError) throw participantError;

      for (const participant of participants || []) {
        const { data: delivery, error: deliveryError } = await admin
          .from("competition_notification_deliveries")
          .insert({
            competition_id: competition.id,
            reminder_key: reminderKey,
            user_id: participant.user_id,
          })
          .select("reminder_key")
          .maybeSingle();
        if (deliveryError?.code === "23505") continue;
        if (deliveryError) throw deliveryError;
        if (!delivery) continue;

        const dedupeKey = createHash("sha256")
          .update(`competition:${competition.id}:${participant.user_id}:${reminderKey}`)
          .digest("hex")
          .slice(0, 32);
        const { error: notificationError } = await admin.from("notifications").insert({
          actor_id: null,
          body: `Mai sunt ${formatRemaining(remainingMinutes)} din competiție.`,
          dedupe_key: dedupeKey,
          href: `/competitions/${competition.id}`,
          metadata: {
            competitionId: competition.id,
            competitionName: competition.name,
            remainingMinutes,
            reminderKey,
          },
          title: `${competition.name}: timp rămas`,
          type: "competition_time",
          user_id: participant.user_id,
        });
        if (notificationError?.code !== "23505" && notificationError) {
          throw notificationError;
        }
        try {
          await queueNotificationEmail({
            recipientId: participant.user_id,
            type: "competition_time",
            title: `${competition.name}: timp rămas`,
            body: `Mai sunt ${formatRemaining(remainingMinutes)} din competiție.`,
            href: `/competitions/${competition.id}`,
            dedupeKey,
          });
        } catch (mailError) {
          console.error("Could not queue competition reminder email:", mailError);
        }
        delivered += 1;
      }
    }

    return NextResponse.json({ checked: competitions?.length || 0, delivered });
  } catch (error) {
    console.error("Competition reminder cron failed:", error);
    return NextResponse.json({ error: "Competition reminder delivery failed" }, { status: 500 });
  }
}
