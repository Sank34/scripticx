import { NextResponse } from "next/server";

import {
  githubFetch,
  hashProjectFiles,
  publicProjectLink,
  readRepositoryFiles,
  requireInstallationForUser,
} from "@/lib/server/githubApp";
import {
  buildGitHubProjectEntries,
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

type RepositoryDetails = {
  default_branch?: string;
  description?: string | null;
  id?: number;
  name?: string;
  owner?: { login?: string };
  private?: boolean;
};

export async function POST(request: Request) {
  let createdProjectId: string | null = null;
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 8_000));
    const installationId = Number(body.installationId);
    const repositoryId = Number(body.repositoryId);
    const owner = stringField(body.owner, { min: 1, max: 100 });
    const repo = stringField(body.repo, { min: 1, max: 100 });
    const requestedTitle =
      body.title === undefined
        ? ""
        : stringField(body.title, { min: 0, max: 120 });

    if (
      !Number.isSafeInteger(installationId) ||
      !Number.isSafeInteger(repositoryId) ||
      !isValidGitHubOwner(owner) ||
      !isValidGitHubRepositoryName(repo)
    ) {
      throw new HttpError(400, "Invalid GitHub repository selection");
    }

    const token = await requireInstallationForUser(user.id, installationId);
    const repository = await githubFetch<RepositoryDetails>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { authToken: token }
    );
    if (
      repository.id !== repositoryId ||
      repository.name?.toLowerCase() !== repo.toLowerCase() ||
      repository.owner?.login?.toLowerCase() !== owner.toLowerCase()
    ) {
      throw new HttpError(403, "GitHub repository access denied");
    }

    const branch = repository.default_branch || "main";
    const remote = await readRepositoryFiles({ branch, owner, repo, token });
    if (!remote.files.length) {
      throw new HttpError(422, "Repository has no supported source files");
    }

    const title = requestedTitle || repository.name || repo;
    const primaryFile =
      remote.files.find((file) => file.path === "main.msp") || remote.files[0];
    const admin = createAdminSupabase();
    const { data: project, error: projectError } = await admin
      .from("snippets")
      .insert({
        user_id: user.id,
        title,
        description: repository.description || "",
        code: primaryFile?.content || "",
        files: buildGitHubProjectEntries(remote.files),
        is_public: false,
      })
      .select("id")
      .single<{ id: string }>();
    if (projectError || !project) throw projectError || new Error("Project was not created");
    createdProjectId = project.id;

    const now = new Date().toISOString();
    const { data: link, error: linkError } = await admin
      .from("github_project_links")
      .insert({
        project_id: project.id,
        user_id: user.id,
        installation_id: installationId,
        repository_id: repositoryId,
        owner,
        repo,
        default_branch: branch,
        current_branch: branch,
        head_sha: remote.headSha,
        remote_head_sha: remote.headSha,
        sync_status: "clean",
        tracked_paths: remote.files.map((file) => file.path),
        file_hashes: hashProjectFiles(remote.files),
        last_synced_at: now,
      })
      .select(
        "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
      )
      .single();
    if (linkError || !link) throw linkError || new Error("Repository link was not created");

    return NextResponse.json(
      {
        project: { id: project.id, title },
        link: publicProjectLink(link),
        importedFileCount: remote.files.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdProjectId) {
      await createAdminSupabase().from("snippets").delete().eq("id", createdProjectId);
    }
    return githubRouteError(error, "Could not clone GitHub repository");
  }
}
