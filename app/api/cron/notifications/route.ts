import { NextResponse } from "next/server";

import { queueNotificationEmail } from "@/lib/mail/service";
import { deliverQueuedPushNotifications } from "@/lib/push-notifications";
import { finishSystemJob, startSystemJob } from "@/lib/server/jobRuns";
import { stableEventKey } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ReminderDraft = {
  user_id: string;
  actor_id: null;
  type: "assignment_deadline" | "competition_starting";
  title: string;
  body: string;
  href: string;
  metadata: Record<string, unknown>;
  dedupe_key: string;
};

type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  deadline: string;
};

type CompetitionRow = {
  id: string;
  name: string;
  starts_at: string;
};

function reminderWindow(target: string, now: number) {
  const minutes = Math.ceil((Date.parse(target) - now) / 60_000);
  if (minutes <= 0 || minutes > 24 * 60) return null;
  return minutes <= 75 ? { key: "1h", minutes } : { key: "24h", minutes };
}

function formatRemaining(minutes: number, locale: "en" | "ro") {
  if (minutes <= 75) return locale === "ro" ? "aproximativ o oră" : "about one hour";
  return locale === "ro" ? "mai puțin de o zi" : "less than a day";
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Notification cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = await startSystemJob("notifications");
  try {
    const admin = createAdminSupabase();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const horizonIso = new Date(now + 24 * 60 * 60_000).toISOString();

    const [{ data: assignments, error: assignmentError }, { data: competitions, error: competitionError }] =
      await Promise.all([
        admin
          .from("assignments")
          .select("id, class_id, title, deadline")
          .eq("status", "published")
          .gt("deadline", nowIso)
          .lte("deadline", horizonIso)
          .limit(200)
          .returns<AssignmentRow[]>(),
        admin
          .from("competitions")
          .select("id, name, starts_at")
          .eq("status", "published")
          .gt("starts_at", nowIso)
          .lte("starts_at", horizonIso)
          .limit(100)
          .returns<CompetitionRow[]>(),
      ]);
    if (assignmentError) throw assignmentError;
    if (competitionError) throw competitionError;

    const assignmentClassIds = [...new Set((assignments || []).map((item) => item.class_id))];
    const competitionIds = (competitions || []).map((item) => item.id);
    const [{ data: classes, error: classError }, { data: classMembers, error: memberError }, { data: participants, error: participantError }] =
      await Promise.all([
        assignmentClassIds.length
          ? admin.from("classes").select("id, name").in("id", assignmentClassIds)
          : Promise.resolve({ data: [], error: null }),
        assignmentClassIds.length
          ? admin
              .from("class_members")
              .select("class_id, user_id")
              .in("class_id", assignmentClassIds)
              .eq("role", "student")
          : Promise.resolve({ data: [], error: null }),
        competitionIds.length
          ? admin
              .from("competition_participants")
              .select("competition_id, user_id")
              .in("competition_id", competitionIds)
              .eq("status", "active")
          : Promise.resolve({ data: [], error: null }),
      ]);
    if (classError) throw classError;
    if (memberError) throw memberError;
    if (participantError) throw participantError;

    const recipientIds = [...new Set([
      ...(classMembers || []).map((item) => item.user_id),
      ...(participants || []).map((item) => item.user_id),
    ])];
    const { data: preferences, error: preferenceError } = recipientIds.length
      ? await admin
          .from("user_language_preferences")
          .select("user_id, locale")
          .in("user_id", recipientIds)
      : { data: [], error: null };
    if (preferenceError && preferenceError.code !== "42P01" && preferenceError.code !== "PGRST205") {
      throw preferenceError;
    }

    const localeByUser = new Map<string, "en" | "ro">(
      (preferences || []).map((item) => [
        item.user_id,
        item.locale === "ro" ? "ro" : "en",
      ])
    );
    const classById = new Map((classes || []).map((item) => [item.id, item.name]));
    const membersByClass = new Map<string, string[]>();
    for (const member of classMembers || []) {
      membersByClass.set(member.class_id, [
        ...(membersByClass.get(member.class_id) || []),
        member.user_id,
      ]);
    }
    const participantsByCompetition = new Map<string, string[]>();
    for (const participant of participants || []) {
      participantsByCompetition.set(participant.competition_id, [
        ...(participantsByCompetition.get(participant.competition_id) || []),
        participant.user_id,
      ]);
    }

    const drafts: ReminderDraft[] = [];
    for (const assignment of assignments || []) {
      const window = reminderWindow(assignment.deadline, now);
      if (!window) continue;
      const className = classById.get(assignment.class_id) || "ScripticX";
      for (const userId of membersByClass.get(assignment.class_id) || []) {
        const locale = localeByUser.get(userId) || "en";
        drafts.push({
          user_id: userId,
          actor_id: null,
          type: "assignment_deadline",
          title: locale === "ro" ? `Termen apropiat în ${className}` : `Deadline approaching in ${className}`,
          body:
            locale === "ro"
              ? `${assignment.title} este scadentă în ${formatRemaining(window.minutes, locale)}.`
              : `${assignment.title} is due in ${formatRemaining(window.minutes, locale)}.`,
          href: `/classes/${assignment.class_id}/assignments/${assignment.id}`,
          metadata: {
            assignmentId: assignment.id,
            classId: assignment.class_id,
            className,
            deadline: assignment.deadline,
            reminderWindow: window.key,
          },
          dedupe_key: stableEventKey({
            type: "assignment_deadline",
            assignmentId: assignment.id,
            userId,
            window: window.key,
          }),
        });
      }
    }

    for (const competition of competitions || []) {
      const window = reminderWindow(competition.starts_at, now);
      if (!window) continue;
      for (const userId of participantsByCompetition.get(competition.id) || []) {
        const locale = localeByUser.get(userId) || "en";
        drafts.push({
          user_id: userId,
          actor_id: null,
          type: "competition_starting",
          title: locale === "ro" ? `${competition.name} începe în curând` : `${competition.name} starts soon`,
          body:
            locale === "ro"
              ? `Competiția începe în ${formatRemaining(window.minutes, locale)}.`
              : `The competition starts in ${formatRemaining(window.minutes, locale)}.`,
          href: `/competitions/${competition.id}`,
          metadata: {
            competitionId: competition.id,
            competitionName: competition.name,
            startsAt: competition.starts_at,
            reminderWindow: window.key,
          },
          dedupe_key: stableEventKey({
            type: "competition_starting",
            competitionId: competition.id,
            userId,
            window: window.key,
          }),
        });
      }
    }

    const { data: inserted, error: insertError } = drafts.length
      ? await admin
          .from("notifications")
          .upsert(drafts, { onConflict: "dedupe_key", ignoreDuplicates: true })
          .select("user_id, type, title, body, href, dedupe_key")
      : { data: [], error: null };
    if (insertError) throw insertError;

    await Promise.all(
      (inserted || []).map((item) =>
        queueNotificationEmail({
          recipientId: item.user_id,
          type: item.type,
          title: item.title,
          body: item.body,
          href: item.href,
          dedupeKey: item.dedupe_key,
        }).catch((mailError) => {
          console.error("Could not queue reminder email:", mailError);
        })
      )
    );

    const push = await deliverQueuedPushNotifications(100);
    const result = {
      checked: {
        assignments: assignments?.length || 0,
        competitions: competitions?.length || 0,
      },
      created: inserted?.length || 0,
      push,
    };
    await finishSystemJob(runId, { status: "succeeded", result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notification cron failed:", error);
    await finishSystemJob(runId, { status: "failed", error });
    return NextResponse.json({ error: "Notification delivery failed" }, { status: 500 });
  }
}
