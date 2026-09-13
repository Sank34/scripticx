import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };
type ReportStatus = "dismissed" | "open" | "resolved" | "reviewing";

function uuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return value;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAdmin(request);
    const { reportId } = await context.params;
    const safeReportId = uuid(reportId, "report id");
    await enforceRateLimit({
      action: "admin_companion_report_moderation",
      key: user.id,
      limit: 60,
      windowSeconds: 60,
    });
    const body = jsonObject(await readJsonBody(request, 8_000));
    const allowed = new Set<ReportStatus>(["dismissed", "open", "resolved", "reviewing"]);
    if (typeof body.status !== "string" || !allowed.has(body.status as ReportStatus)) {
      throw new HttpError(400, "Invalid report status");
    }
    const status = body.status as ReportStatus;
    const resolutionNote = body.resolutionNote === undefined || body.resolutionNote === null || body.resolutionNote === ""
      ? null
      : stringField(body.resolutionNote, { max: 2_000 });
    if ((status === "resolved" || status === "dismissed") && !resolutionNote) {
      throw new HttpError(400, "Add a short resolution note");
    }

    const admin = createAdminSupabase();
    const { data: current, error: readError } = await admin
      .from("content_reports")
      .select("id,status,target_user_id")
      .eq("id", safeReportId)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new HttpError(404, "Report not found");

    const reviewed = status === "resolved" || status === "dismissed";
    const now = new Date().toISOString();
    const { data: report, error: updateError } = await admin
      .from("content_reports")
      .update({
        resolution_note: resolutionNote,
        reviewed_at: reviewed ? now : null,
        reviewed_by: reviewed || status === "reviewing" ? user.id : null,
        status,
        updated_at: now,
      })
      .eq("id", safeReportId)
      .select("id,reporter_id,target_type,target_id,target_user_id,reason,details,status,resolution_note,reviewed_at,created_at,updated_at")
      .single();
    if (updateError) throw updateError;

    const action = status === "reviewing"
      ? "review_report"
      : status === "resolved"
        ? "resolve_report"
        : status === "dismissed"
          ? "dismiss_report"
          : "reopen_report";
    const { error: auditError } = await admin.from("admin_moderation_log").insert({
      action,
      actor_id: user.id,
      metadata: { previousStatus: current.status },
      note: resolutionNote,
      report_id: safeReportId,
      target_user_id: current.target_user_id,
    });
    if (auditError) throw auditError;
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update report:", error);
    return NextResponse.json({ error: "Could not update report" }, { status: 500 });
  }
}
