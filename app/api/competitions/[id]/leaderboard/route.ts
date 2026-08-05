import { NextResponse } from "next/server";

import { competitionId } from "@/lib/server/competitionService";
import { HttpError, requireUser } from "@/lib/server/requestSecurity";
import { createAuthenticatedServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { accessToken } = await requireUser(request);
    const { id } = await context.params;
    const { data, error } = await createAuthenticatedServerSupabase(accessToken).rpc(
      "get_competition_leaderboard",
      { p_competition_id: competitionId(id) }
    );
    if (error) {
      if (/not available|permission|access/i.test(error.message)) {
        throw new HttpError(403, "Leaderboard is not available yet");
      }
      throw error;
    }
    const leaderboard = (data || []).map((entry: Record<string, unknown>) => ({
      ...entry,
      position: Number(entry.rank_position ?? entry.position),
    }));
    return NextResponse.json({ leaderboard });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not load competition leaderboard:", error);
    return NextResponse.json({ error: "Could not load leaderboard" }, { status: 500 });
  }
}
