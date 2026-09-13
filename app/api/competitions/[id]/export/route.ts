import { NextResponse } from "next/server";

import { competitionId } from "@/lib/server/competitionService";
import { HttpError, requireAdmin } from "@/lib/server/requestSecurity";
import { createAuthenticatedServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { accessToken } = await requireAdmin(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const admin = createAdminSupabase();
    const [{ data: competition, error: competitionError }, leaderboardResult] =
      await Promise.all([
        admin
          .from("competitions")
          .select("name, slug")
          .eq("id", safeId)
          .maybeSingle<{ name: string; slug: string }>(),
        createAuthenticatedServerSupabase(accessToken).rpc(
          "get_competition_leaderboard",
          { p_competition_id: safeId }
        ),
      ]);
    if (competitionError) throw competitionError;
    if (leaderboardResult.error) throw leaderboardResult.error;
    if (!competition) throw new HttpError(404, "Competition not found");

    const header = [
      "Position",
      "Username",
      "User ID",
      "Total points",
      "Solved problems",
      "Last submission",
    ];
    const rows = (leaderboardResult.data || []).map((entry: Record<string, unknown>) => [
      entry.rank_position ?? entry.position,
      entry.username,
      entry.user_id,
      entry.total_points,
      entry.solved_count,
      entry.last_submission_at,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${competition.slug}-leaderboard.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not export competition leaderboard:", error);
    return NextResponse.json({ error: "Could not export leaderboard" }, { status: 500 });
  }
}
