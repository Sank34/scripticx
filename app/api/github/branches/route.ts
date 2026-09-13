import { NextResponse } from "next/server";

import {
  getBranchHead,
  githubFetch,
  publicProjectLink,
  requireProjectLink,
} from "@/lib/server/githubApp";
import { isValidGitBranchName } from "@/lib/github-integration";
import { githubRouteError } from "@/lib/server/githubRoute";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
    if (!projectId) throw new HttpError(400, "Project ID is required");
    const { link, token } = await requireProjectLink(user.id, projectId);
    const branches = await githubFetch<Array<{
      name?: string;
      protected?: boolean;
      commit?: { sha?: string };
    }>>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/branches?per_page=100`,
      { authToken: token }
    );
    return NextResponse.json({
      branches: branches
        .filter((branch) => Boolean(branch.name && branch.commit?.sha))
        .map((branch) => ({
          name: branch.name,
          protected: branch.protected === true,
          sha: branch.commit?.sha,
        })),
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub branches");
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 4_000));
    const projectId = stringField(body.projectId, { min: 1, max: 100 });
    const branch = stringField(body.branch, { min: 1, max: 255 });
    if (!isValidGitBranchName(branch)) throw new HttpError(400, "Invalid branch name");

    const { link, token } = await requireProjectLink(user.id, projectId);
    const sourceSha = await getBranchHead({
      branch: link.current_branch,
      owner: link.owner,
      repo: link.repo,
      token,
    });
    await githubFetch(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/refs`,
      {
        authToken: token,
        method: "POST",
        body: { ref: `refs/heads/${branch}`, sha: sourceSha },
      }
    );
    const { data, error } = await createAdminSupabase()
      .from("github_project_links")
      .update({
        current_branch: branch,
        head_sha: sourceSha,
        remote_head_sha: sourceSha,
        sync_status: "clean",
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select(
        "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
      )
      .single();
    if (error) throw error;
    return NextResponse.json({ link: publicProjectLink(data) }, { status: 201 });
  } catch (error) {
    return githubRouteError(error, "Could not create GitHub branch");
  }
}
