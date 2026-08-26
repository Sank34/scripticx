import { NextResponse } from "next/server";

import {
  createInstallationToken,
  getProjectLink,
  listInstallationRepositories,
  publicProjectLink,
  requireOwnedProject,
} from "@/lib/server/githubApp";
import { githubRouteError } from "@/lib/server/githubRoute";
import { requireUser } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || null;
    if (projectId) await requireOwnedProject(user.id, projectId);

    const admin = createAdminSupabase();
    const { data: memberships, error: membershipsError } = await admin
      .from("github_installation_users")
      .select("installation_id")
      .eq("user_id", user.id);
    if (membershipsError) throw membershipsError;

    const installationIds = (memberships || []).map((row) => Number(row.installation_id));
    const { data: installations, error: installationsError } = installationIds.length
      ? await admin
          .from("github_installations")
          .select("installation_id, account_login, account_type, repository_selection, suspended_at")
          .in("installation_id", installationIds)
      : { data: [], error: null };
    if (installationsError) throw installationsError;

    const repositories = (
      await Promise.all(
        (installations || [])
          .filter((installation) => !installation.suspended_at)
          .map(async (installation) => {
            const installationId = Number(installation.installation_id);
            const token = await createInstallationToken(installationId);
            return listInstallationRepositories(installationId, token);
          })
      )
    )
      .flat()
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const link = projectId ? await getProjectLink(user.id, projectId) : null;
    return NextResponse.json({
      configured: true,
      installations: (installations || []).map((installation) => ({
        accountLogin: installation.account_login,
        accountType: installation.account_type,
        id: Number(installation.installation_id),
        repositorySelection: installation.repository_selection,
        suspended: Boolean(installation.suspended_at),
      })),
      link: link ? publicProjectLink(link) : null,
      repositories,
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub repositories");
  }
}

