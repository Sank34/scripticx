import { NextResponse } from "next/server";

import {
  hashProjectFiles,
  publicProjectLink,
  readRepositoryFiles,
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

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 4_000));
    const projectId = stringField(body.projectId, { min: 1, max: 100 });
    const { link, token } = await requireProjectLink(user.id, projectId);
    const branch =
      body.branch === undefined
        ? link.current_branch
        : stringField(body.branch, { min: 1, max: 255 });
    if (!isValidGitBranchName(branch)) throw new HttpError(400, "Invalid branch name");

    const remote = await readRepositoryFiles({
      branch,
      owner: link.owner,
      repo: link.repo,
      token,
    });
    const now = new Date().toISOString();
    const { data, error } = await createAdminSupabase()
      .from("github_project_links")
      .update({
        current_branch: branch,
        head_sha: remote.headSha,
        remote_head_sha: remote.headSha,
        sync_status: "clean",
        tracked_paths: remote.files.map((file) => file.path),
        file_hashes: hashProjectFiles(remote.files),
        last_synced_at: now,
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select(
        "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
      )
      .single();
    if (error) throw error;

    return NextResponse.json({ files: remote.files, link: publicProjectLink(data) });
  } catch (error) {
    return githubRouteError(error, "Could not synchronize GitHub project");
  }
}

