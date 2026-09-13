import { NextResponse } from "next/server";

import {
  getGitHubInstallation,
  hashInstallState,
} from "@/lib/server/githubApp";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function editorRedirect(request: Request, result: "connected" | "error") {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configuredSite || new URL(request.url).origin;
  const url = new URL("/editor", origin);
  url.searchParams.set("view", "source-control");
  url.searchParams.set("github", result);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = Number(url.searchParams.get("installation_id"));
  const state = url.searchParams.get("state")?.trim() || "";
  if (!Number.isSafeInteger(installationId) || installationId <= 0 || state.length < 32) {
    return editorRedirect(request, "error");
  }

  try {
    const admin = createAdminSupabase();
    const stateHash = hashInstallState(state);
    const { data: pendingState, error: stateError } = await admin
      .from("github_install_states")
      .select("token_hash, user_id, expires_at, used_at")
      .eq("token_hash", stateHash)
      .maybeSingle<{
        token_hash: string;
        user_id: string;
        expires_at: string;
        used_at: string | null;
      }>();
    if (
      stateError ||
      !pendingState ||
      pendingState.used_at ||
      new Date(pendingState.expires_at).getTime() <= Date.now()
    ) {
      return editorRedirect(request, "error");
    }

    // This request authenticates as the GitHub App and proves that the
    // installation ID belongs to this app rather than trusting the redirect.
    const installation = await getGitHubInstallation(installationId);
    if (installation.id !== installationId || !installation.account?.login) {
      return editorRedirect(request, "error");
    }

    const claimedAt = new Date().toISOString();
    const { data: claimedState, error: claimError } = await admin
      .from("github_install_states")
      .update({ used_at: claimedAt })
      .eq("token_hash", stateHash)
      .is("used_at", null)
      .gt("expires_at", claimedAt)
      .select("user_id")
      .maybeSingle<{ user_id: string }>();
    if (claimError || !claimedState || claimedState.user_id !== pendingState.user_id) {
      return editorRedirect(request, "error");
    }

    const { error: installationError } = await admin
      .from("github_installations")
      .upsert(
        {
          installation_id: installationId,
          account_id: installation.account.id || null,
          account_login: installation.account.login,
          account_type: installation.account.type || "User",
          repository_selection: installation.repository_selection || "selected",
          suspended_at: installation.suspended_at || null,
        },
        { onConflict: "installation_id" }
      );
    if (installationError) throw installationError;

    const { error: memberError } = await admin
      .from("github_installation_users")
      .upsert(
        { installation_id: installationId, user_id: pendingState.user_id },
        { onConflict: "installation_id,user_id" }
      );
    if (memberError) throw memberError;

    return editorRedirect(request, "connected");
  } catch (error) {
    console.error("Could not complete GitHub installation setup", error);
    return editorRedirect(request, "error");
  }
}
