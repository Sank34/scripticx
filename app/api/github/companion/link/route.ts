import { NextResponse } from "next/server";

import {
  GitHubApiError,
  getBranchHead,
  requireOwnedProject,
  requireRepositoryForUser,
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

type TargetKind = "class" | "project";

async function requireManagedClass(userId: string, role: string, classId: string) {
  const admin = createAdminSupabase();
  const { data: classRow, error: classError } = await admin
    .from("classes")
    .select("id,teacher_id")
    .eq("id", classId)
    .maybeSingle<{ id: string; teacher_id: string }>();
  if (classError) throw classError;
  if (!classRow) throw new HttpError(404, "Class not found");
  if (role === "admin" || classRow.teacher_id === userId) return classRow;
  const { data: membership, error: membershipError } = await admin
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .eq("role", "teacher")
    .maybeSingle<{ role: string }>();
  if (membershipError) throw membershipError;
  if (!membership) throw new HttpError(403, "Teacher access is required");
  return classRow;
}

function parseTargetKind(value: unknown): TargetKind {
  if (value !== "class" && value !== "project") {
    throw new HttpError(400, "Invalid association type");
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const { role, user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 8_000));
    const targetKind = parseTargetKind(body.targetKind);
    const targetId = stringField(body.targetId, { min: 1, max: 100 });
    const installationId = Number(body.installationId);
    const repositoryId = Number(body.repositoryId);
    const owner = stringField(body.owner, { min: 1, max: 100 });
    const repo = stringField(body.repo, { min: 1, max: 100 });
    const branch = stringField(body.branch, { min: 1, max: 255 });
    if (
      !Number.isSafeInteger(installationId) ||
      installationId <= 0 ||
      !Number.isSafeInteger(repositoryId) ||
      repositoryId <= 0 ||
      !isValidGitHubOwner(owner) ||
      !isValidGitHubRepositoryName(repo) ||
      !isValidGitBranchName(branch)
    ) {
      throw new HttpError(400, "Invalid GitHub repository selection");
    }

    if (targetKind === "project") await requireOwnedProject(user.id, targetId);
    else await requireManagedClass(user.id, role, targetId);

    const { repository, token } = await requireRepositoryForUser({
      installationId,
      owner,
      repo,
      repositoryId,
      userId: user.id,
    });
    let headSha: string | null = null;
    try {
      headSha = await getBranchHead({ branch, owner, repo, token });
    } catch (error) {
      if (!(error instanceof GitHubApiError) || ![404, 409, 422].includes(error.status)) {
        throw error;
      }
    }
    const defaultBranch = repository.default_branch;
    const admin = createAdminSupabase();

    if (targetKind === "project") {
      const { data, error } = await admin
        .from("github_project_links")
        .upsert(
          {
            current_branch: branch,
            default_branch: defaultBranch,
            file_hashes: {},
            head_sha: headSha,
            installation_id: installationId,
            owner,
            project_id: targetId,
            remote_head_sha: headSha,
            repo,
            repository_id: repositoryId,
            sync_status: "unknown",
            tracked_paths: [],
            user_id: user.id,
          },
          { onConflict: "project_id" }
        )
        .select("project_id,current_branch,updated_at")
        .single();
      if (error) throw error;
      return NextResponse.json(
        {
          association: {
            branch: data.current_branch,
            repositoryId,
            targetId: data.project_id,
            targetKind,
            updatedAt: data.updated_at,
          },
        },
        { status: 201 }
      );
    }

    const { data, error } = await admin
      .from("github_class_links")
      .upsert(
        {
          class_id: targetId,
          current_branch: branch,
          default_branch: defaultBranch,
          installation_id: installationId,
          owner,
          repo,
          repository_id: repositoryId,
          user_id: user.id,
        },
        { onConflict: "class_id,repository_id" }
      )
      .select("id,class_id,current_branch,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json(
      {
        association: {
          branch: data.current_branch,
          id: data.id,
          repositoryId,
          targetId: data.class_id,
          targetKind,
          updatedAt: data.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return githubRouteError(error, "Could not associate GitHub repository");
  }
}

export async function DELETE(request: Request) {
  try {
    const { role, user } = await requireUser(request);
    const params = new URL(request.url).searchParams;
    const targetKind = parseTargetKind(params.get("targetKind"));
    const targetId = params.get("targetId")?.trim() || "";
    const repositoryId = Number(params.get("repositoryId"));
    if (!targetId) throw new HttpError(400, "Association target is required");

    const admin = createAdminSupabase();
    if (targetKind === "project") {
      await requireOwnedProject(user.id, targetId);
      const { error } = await admin
        .from("github_project_links")
        .delete()
        .eq("project_id", targetId)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      await requireManagedClass(user.id, role, targetId);
      if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
        throw new HttpError(400, "Repository ID is required");
      }
      const { error } = await admin
        .from("github_class_links")
        .delete()
        .eq("class_id", targetId)
        .eq("repository_id", repositoryId);
      if (error) throw error;
    }
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return githubRouteError(error, "Could not remove GitHub association");
  }
}
