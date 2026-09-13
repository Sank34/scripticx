import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";
import { HttpError, requireUser, stringField } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const problemId = stringField(new URL(request.url).searchParams.get("problemId"), {
      min: 1,
      max: 100,
    });
    const { data, error } = await createAdminSupabase()
      .from("submissions")
      .select("id, problem_id, code, score, created_at, verified_at")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ submissions: data || [] });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not load submission history:", error);
    return NextResponse.json({ error: "Could not load submissions" }, { status: 500 });
  }
}
