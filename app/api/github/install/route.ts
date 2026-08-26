import { NextResponse } from "next/server";

import { buildGitHubInstallationUrl, createInstallState } from "@/lib/server/githubApp";
import { githubRouteError } from "@/lib/server/githubRoute";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const { state, hash } = createInstallState();
    const admin = createAdminSupabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    await admin
      .from("github_install_states")
      .delete()
      .eq("user_id", user.id)
      .lt("expires_at", now.toISOString());

    const { error } = await admin.from("github_install_states").insert({
      token_hash: hash,
      user_id: user.id,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return NextResponse.json({ url: buildGitHubInstallationUrl(state) });
  } catch (error) {
    return githubRouteError(error, "Could not start GitHub installation");
  }
}

