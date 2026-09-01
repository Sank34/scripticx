import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await createAdminSupabase()
      .from("updates")
      .select("id, slug, title_i18n, content_i18n, date, tag, created_at")
      .lte("date", today)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return NextResponse.json(
      { updates: data || [] },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("Could not load published updates:", error);
    return NextResponse.json({ error: "Could not load updates" }, { status: 500 });
  }
}
