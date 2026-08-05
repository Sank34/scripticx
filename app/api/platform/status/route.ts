import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await createAdminSupabase()
      .from("platform_settings")
      .select("lockdown_enabled, lockdown_message, lockdown_enabled_at, updated_at")
      .eq("id", "global")
      .maybeSingle();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return NextResponse.json({ lockdownEnabled: false });
    }
    if (error) throw error;

    return NextResponse.json(
      {
        lockdownEnabled: data?.lockdown_enabled || false,
        message: data?.lockdown_message || null,
        enabledAt: data?.lockdown_enabled_at || null,
        updatedAt: data?.updated_at || null,
      },
      { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } }
    );
  } catch (error) {
    console.error("Could not read platform status:", error);
    return NextResponse.json({ error: "Could not read platform status" }, { status: 500 });
  }
}
