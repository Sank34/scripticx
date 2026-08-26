import { NextResponse } from "next/server";

import { buildOnboardingStats } from "@/lib/onboarding-stats";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim() || null
    : null;
}

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const auth = createServerSupabase();
  const { data: { user: actor }, error: actorError } = await auth.auth.getUser(token);
  if (actorError || !actor) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  try {
    const admin = createAdminSupabase();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", actor.id)
      .maybeSingle<{ role: string | null }>();
    if (profileError) throw profileError;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

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
    console.error("Could not aggregate onboarding statistics:", error);
    return NextResponse.json({ error: "Could not load onboarding statistics" }, { status: 500 });
  }
}
