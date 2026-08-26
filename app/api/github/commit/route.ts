import { NextResponse } from "next/server";

import {
  encodeGitRef,
  getBranchHead,
  githubFetch,
  hashProjectFiles,
  publicProjectLink,
  requireProjectLink,
} from "@/lib/server/githubApp";
import {
  GITHUB_MANAGED_FILE_LIMIT,
  normalizeGitHubFiles,
  type GitHubRemoteFile,
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
    const body = jsonObject(await readJsonBody(request, 5_500_000));
    const projectId = stringField(body.projectId, { min: 1, max: 100 });
    const message = stringField(body.message, { min: 1, max: 240 });
    if (!Array.isArray(body.files) || body.files.length > GITHUB_MANAGED_FILE_LIMIT) {
      throw new HttpError(400, "Invalid project files");
    }
    let files: GitHubRemoteFile[];
    try {
      files = normalizeGitHubFiles(
        body.files.map((candidate) => {
          const file = jsonObject(candidate);
          return {
            path: stringField(file.path, { min: 1, max: 1024 }),
            content: stringField(file.content, {
              min: 0,
              max: 512_000,
              trim: false,
            }),
          };
        })
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "Invalid project files");
    }

    const { link, token } = await requireProjectLink(user.id, projectId);
    const remoteHeadSha = await getBranchHead({
      branch: link.current_branch,
      owner: link.owner,
      repo: link.repo,
      token,
    });
    if (link.head_sha && remoteHeadSha !== link.head_sha) {
      await createAdminSupabase()
        .from("github_project_links")
        .update({ remote_head_sha: remoteHeadSha, sync_status: "behind" })
        .eq("project_id", projectId)
        .eq("user_id", user.id);
      throw new HttpError(409, "The remote branch changed. Pull before pushing your commit.");
    }

    const currentHashes = hashProjectFiles(files);
    const previousHashes = link.file_hashes || {};
    const deletedPaths = (link.tracked_paths || []).filter(
      (path) => !files.some((file) => file.path === path)
    );
    const changedFiles = files.filter(
      (file) => previousHashes[file.path] !== currentHashes[file.path]
    );
    if (!changedFiles.length && !deletedPaths.length) {
      throw new HttpError(400, "There are no changes to commit");
    }

    const currentCommit = await githubFetch<{ tree?: { sha?: string } }>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/commits/${remoteHeadSha}`,
      { authToken: token }
    );
    if (!currentCommit.tree?.sha) throw new HttpError(502, "GitHub commit has no tree");
    const currentTree = await githubFetch<{
      tree?: Array<{ mode?: string; path?: string; type?: string }>;
    }>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/trees/${currentCommit.tree.sha}?recursive=1`,
      { authToken: token }
    );
    const modes = new Map(
      (currentTree.tree || [])
        .filter((entry) => entry.type === "blob" && entry.path && entry.mode)
        .map((entry) => [entry.path as string, entry.mode as string])
    );
    const newTree = await githubFetch<{ sha?: string }>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/trees`,
      {
        authToken: token,
        method: "POST",
        body: {
          base_tree: currentCommit.tree.sha,
          tree: [
            ...changedFiles.map((file) => ({
              path: file.path,
              mode: modes.get(file.path) || "100644",
              type: "blob",
              content: file.content,
            })),
            ...deletedPaths.map((path) => ({
              path,
              mode: modes.get(path) || "100644",
              type: "blob",
              sha: null,
            })),
          ],
        },
      }
    );
    if (!newTree.sha) throw new HttpError(502, "GitHub did not create a tree");

    const commit = await githubFetch<{ sha?: string; html_url?: string }>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/commits`,
      {
        authToken: token,
        method: "POST",
        body: { message, tree: newTree.sha, parents: [remoteHeadSha] },
      }
    );
    if (!commit.sha) throw new HttpError(502, "GitHub did not create a commit");
    await githubFetch(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/git/refs/heads/${encodeGitRef(link.current_branch)}`,
      {
        authToken: token,
        method: "PATCH",
        body: { sha: commit.sha, force: false },
      }
    );

    const now = new Date().toISOString();
    const { data, error } = await createAdminSupabase()
      .from("github_project_links")
      .update({
        head_sha: commit.sha,
        remote_head_sha: commit.sha,
        sync_status: "clean",
        tracked_paths: files.map((file) => file.path),
        file_hashes: currentHashes,
        last_synced_at: now,
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select(
        "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
      )
      .single();
    if (error) throw error;

    return NextResponse.json({
      commit: { sha: commit.sha, url: commit.html_url || null },
      link: publicProjectLink(data),
    });
  } catch (error) {
    return githubRouteError(error, "Could not commit GitHub project");
  }
}

