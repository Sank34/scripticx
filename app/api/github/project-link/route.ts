import { NextResponse } from "next/server";

import {
  getBranchHead,
  githubFetch,
  publicProjectLink,
  requireInstallationForUser,
  requireOwnedProject,
} from "@/lib/server/githubApp";
import {
  isValidGitBranchName,
  isValidGitHubOwner,
  isValidGitHubRepositoryName,
} from "@/lib/github-integration";
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
    const body = jsonObject(await readJsonBody(request, 8_000));
    const projectId = stringField(body.projectId, { min: 1, max: 100 });
    const installationId = Number(body.installationId);
    const repositoryId = Number(body.repositoryId);
    const owner = stringField(body.owner, { min: 1, max: 100 });
    const repo = stringField(body.repo, { min: 1, max: 100 });
    const requestedBranch = stringField(body.branch, { min: 1, max: 255 });
    if (
      !Number.isSafeInteger(installationId) ||
      !Number.isSafeInteger(repositoryId) ||
      !isValidGitHubOwner(owner) ||
      !isValidGitHubRepositoryName(repo) ||
      !isValidGitBranchName(requestedBranch)
    ) {
      throw new HttpError(400, "Invalid GitHub repository selection");
    }

    await requireOwnedProject(user.id, projectId);
    const token = await requireInstallationForUser(user.id, installationId);
    const repository = await githubFetch<{
      default_branch?: string;
      id?: number;
      name?: string;
      owner?: { login?: string };
    }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      authToken: token,
    });
    if (
      repository.id !== repositoryId ||
      repository.name?.toLowerCase() !== repo.toLowerCase() ||
      repository.owner?.login?.toLowerCase() !== owner.toLowerCase()
    ) {
      throw new HttpError(403, "GitHub repository access denied");
    }

    const defaultBranch = repository.default_branch || "main";
    const headSha = await getBranchHead({
      branch: requestedBranch,
      owner,
      repo,
      token,
    });
    const { data, error } = await createAdminSupabase()
      .from("github_project_links")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          installation_id: installationId,
          repository_id: repositoryId,
          owner,
          repo,
          default_branch: defaultBranch,
          current_branch: requestedBranch,
          head_sha: headSha,
          remote_head_sha: headSha,
          sync_status: "unknown",
          tracked_paths: [],
          file_hashes: {},
        },
        { onConflict: "project_id" }
      )
      .select(
        "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
      )
      .single();
    if (error) throw error;
    return NextResponse.json({ link: publicProjectLink(data) }, { status: 201 });
  } catch (error) {
    return githubRouteError(error, "Could not connect project to GitHub");
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireUser(request);
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
    if (!projectId) throw new HttpError(400, "Project ID is required");
    await requireOwnedProject(user.id, projectId);
    const { error } = await createAdminSupabase()
      .from("github_project_links")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return githubRouteError(error, "Could not disconnect GitHub repository");
  }
}

