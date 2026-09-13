import { requireAdmin, HttpError } from "@/lib/server/requestSecurity";
import { NextResponse } from "next/server";

import { buildOnboardingStats } from "@/lib/onboarding-stats";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const admin = createAdminSupabase();
    const users: Array<{ user_metadata?: Record<string, unknown> }> = [];
    const perPage = 1000;
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      users.push(...data.users.map((user) => ({ user_metadata: user.user_metadata })));
      if (data.users.length < perPage) break;
    }

    return NextResponse.json(buildOnboardingStats(users));
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not aggregate onboarding statistics:", error);
    return NextResponse.json({ error: "Could not load onboarding statistics" }, { status: 500 });
  }
}
