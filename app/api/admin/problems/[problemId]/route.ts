import { NextResponse } from "next/server";

import { HttpError, requireAdmin } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ problemId: string }> };

function isMissingTable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function deleteProblemReferences(
  admin: ReturnType<typeof createAdminSupabase>,
  problemId: string
) {
  // These relations are optional across older installations. The final delete
  // still enforces any constraints that are not covered by this compatibility list.
  const directRelations = [
    "problem_editor_drafts",
    "lesson_problems",
    "daily_challenges",
    "submissions",
    "assignment_problem_submissions",
    "class_assignment_attempts",
  ] as const;

  for (const table of directRelations) {
    const { error } = await admin.from(table).delete().eq("problem_id", problemId);
    if (error && !isMissingTable(error)) throw error;
  }

  const links = await admin
    .from("competition_problems")
    .select("id")
    .eq("problem_id", problemId);
  if (links.error && !isMissingTable(links.error)) throw links.error;
  const linkIds = (links.data || [])
    .map((link) => (typeof link.id === "string" ? link.id : null))
    .filter((id): id is string => Boolean(id));

  if (linkIds.length) {
    const competitionSubmissions = await admin
      .from("competition_submissions")
      .delete()
      .in("competition_problem_id", linkIds);
    if (competitionSubmissions.error && !isMissingTable(competitionSubmissions.error)) {
      throw competitionSubmissions.error;
    }
  }

  if (!links.error) {
    const competitionLinks = await admin
      .from("competition_problems")
      .delete()
      .eq("problem_id", problemId);
    if (competitionLinks.error && !isMissingTable(competitionLinks.error)) {
      throw competitionLinks.error;
    }
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { problemId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(problemId)) {
      throw new HttpError(400, "Invalid problem id");
    }

    const admin = createAdminSupabase();
    const existing = await admin.from("problems").select("id").eq("id", problemId).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) throw new HttpError(404, "Problem not found");

    let result = await admin.from("problems").delete().eq("id", problemId);
    if (result.error?.code === "23503") {
      await deleteProblemReferences(admin, problemId);
      result = await admin.from("problems").delete().eq("id", problemId);
    }
    if (result.error) {
      console.error("Could not delete problem:", result.error);
      return NextResponse.json(
        { error: "Problem could not be deleted", code: result.error.code },
        { status: result.error.code === "23503" ? 409 : 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not delete problem:", error);
    return NextResponse.json({ error: "Problem could not be deleted" }, { status: 500 });
  }
}
