import { NextResponse } from "next/server";

import { isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { listCompetitionSummaries } from "@/lib/server/competitionService";
import { HttpError, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfileRow = {
  avatar_url: string | null;
  banned: boolean | null;
  id: string;
  role: string | null;
  total_score: number | null;
  username: string | null;
};

type ReportRow = {
  created_at: string;
  details: string | null;
  id: string;
  reason: string;
  reporter_id: string;
  resolution_note: string | null;
  reviewed_at: string | null;
  status: "dismissed" | "open" | "resolved" | "reviewing";
  target_id: string;
  target_type: string;
  target_user_id: string | null;
  updated_at: string;
};

async function countRows(
  table: string,
  filters: Record<string, boolean | string> = {}
) {
  const admin = createAdminSupabase();
  let query = admin.from(table).select("*", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function GET(request: Request) {
  try {
    const { user, role, permissions } = await requireAdmin(request);
    const allowed = (permission: string) => role === "admin" || permissions.includes(permission as typeof permissions[number]);
    const admin = createAdminSupabase();
    const [
      userCount,
      bannedCount,
      problemCount,
      classCount,
      groupCount,
      postCount,
      openReportCount,
      openSupportCount,
      queuedEmailCount,
      failedEmailCount,
      enabledPushDeviceCount,
      profilesResult,
      reportsResult,
      jobsResult,
      emailsResult,
      competitions,
    ] = await Promise.all([
      countRows("profiles"),
      countRows("profiles", { banned: true }),
      countRows("problems"),
      countRows("classes"),
      countRows("study_groups"),
      countRows("posts"),
      countRows("content_reports", { status: "open" }),
      countRows("contact_messages", { status: "new" }),
      countRows("email_outbox", { status: "queued" }),
      countRows("email_outbox", { status: "failed" }),
      countRows("notification_push_devices", { enabled: true }),
      admin
        .from("profiles")
        .select("id,username,avatar_url,role,banned,total_score")
        .order("banned", { ascending: false })
        .order("total_score", { ascending: false })
        .limit(80)
        .returns<ProfileRow[]>(),
      admin
        .from("content_reports")
        .select("id,reporter_id,target_type,target_id,target_user_id,reason,details,status,resolution_note,reviewed_at,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(80)
        .returns<ReportRow[]>(),
      allowed("admin.analytics") ? admin
        .from("system_job_runs")
        .select("id,job,status,started_at,completed_at,result,error")
        .order("started_at", { ascending: false })
        .limit(30) : Promise.resolve({ data: [], error: null }),
      allowed("admin.email") ? admin
        .from("email_outbox")
        .select("id,recipient,subject,kind,status,attempts,last_error,created_at,sent_at")
        .order("created_at", { ascending: false })
        .limit(20) : Promise.resolve({ data: [], error: null }),
      allowed("admin.competitions") ? listCompetitionSummaries(admin, user.id, true) : Promise.resolve([]),
    ]);

    for (const result of [profilesResult, reportsResult, jobsResult, emailsResult]) {
      if (result.error) throw result.error;
    }

    const reports = reportsResult.data || [];
    const profileIds = [...new Set(reports.flatMap((report) => [
      report.reporter_id,
      report.target_user_id,
    ]).filter((id): id is string => Boolean(id)))];
    const { data: reportProfiles, error: reportProfilesError } = profileIds.length
      ? await admin
          .from("profiles")
          .select("id,username,avatar_url,role,banned,total_score")
          .in("id", profileIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[], error: null };
    if (reportProfilesError) throw reportProfilesError;
    const profileById = new Map((reportProfiles || []).map((profile) => [profile.id, profile]));

    const activeCompetitionCount = competitions.filter((competition) =>
      competition.phase === "live" || competition.phase === "upcoming"
    ).length;

    return NextResponse.json({
      competitions: allowed("admin.competitions") ? competitions : [],
      email: allowed("admin.email") ? {
        failed: failedEmailCount,
        messages: emailsResult.data || [],
        queued: queuedEmailCount,
      } : null,
      jobs: allowed("admin.analytics") ? {
        configuration: {
          cron: Boolean(process.env.CRON_SECRET?.trim()),
          emailWorker: isEmailWorkerConfigured(),
        },
        enabledPushDevices: allowed("admin.analytics") ? enabledPushDeviceCount : 0,
        runs: jobsResult.data || [],
      } : null,
      overview: {
        activeCompetitions: allowed("admin.competitions") ? activeCompetitionCount : 0,
        bannedUsers: bannedCount,
        classes: classCount,
        enabledPushDevices: allowed("admin.analytics") ? enabledPushDeviceCount : 0,
        failedEmails: allowed("admin.email") ? failedEmailCount : 0,
        groups: groupCount,
        openReports: openReportCount,
        openSupport: allowed("admin.contact") ? openSupportCount : 0,
        posts: postCount,
        problems: problemCount,
        queuedEmails: allowed("admin.email") ? queuedEmailCount : 0,
        users: userCount,
      },
      reports: reports.map((report) => ({
        ...report,
        reporter: profileById.get(report.reporter_id) || null,
        targetUser: report.target_user_id
          ? profileById.get(report.target_user_id) || null
          : null,
      })),
      users: profilesResult.data || [],
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not load Admin Companion:", error);
    return NextResponse.json({ error: "Could not load Admin Companion" }, { status: 500 });
  }
}
