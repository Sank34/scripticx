import "server-only";

import {
  isValidGitBranchName,
  isValidGitHubOwner,
  isValidGitHubRepositoryName,
} from "@/lib/github-integration";
import { requireRepositoryForUser } from "@/lib/server/githubApp";
import { HttpError } from "@/lib/server/requestSecurity";

const MAX_PATCH_CHARACTERS = 24_000;

export function parseRepositoryQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const installationId = Number(params.get("installationId"));
  const repositoryId = Number(params.get("repositoryId"));
  const owner = params.get("owner")?.trim() || "";
  const repo = params.get("repo")?.trim() || "";
  if (
    !Number.isSafeInteger(installationId) ||
    installationId <= 0 ||
    !Number.isSafeInteger(repositoryId) ||
    repositoryId <= 0 ||
    !isValidGitHubOwner(owner) ||
    !isValidGitHubRepositoryName(repo)
  ) {
    throw new HttpError(400, "Invalid GitHub repository selection");
  }
  return { installationId, owner, repo, repositoryId };
}

export function parseBranch(params: URLSearchParams, fallback: string) {
  const branch = params.get("branch")?.trim() || fallback;
  if (!isValidGitBranchName(branch)) throw new HttpError(400, "Invalid GitHub branch");
  return branch;
}

export function parseCommitSha(params: URLSearchParams) {
  const sha = params.get("sha")?.trim() || "";
  if (!/^[a-f0-9]{7,64}$/i.test(sha)) throw new HttpError(400, "Invalid commit SHA");
  return sha;
}

export function parsePullNumber(params: URLSearchParams) {
  const number = Number(params.get("number"));
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new HttpError(400, "Invalid pull request number");
  }
  return number;
}

export function previewPatch(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return value.length > MAX_PATCH_CHARACTERS
    ? `${value.slice(0, MAX_PATCH_CHARACTERS)}\n… diff truncated`
    : value;
}

export async function requireCompanionRepository(request: Request, userId: string) {
  const selection = parseRepositoryQuery(request);
  const access = await requireRepositoryForUser({ ...selection, userId });
  return { ...selection, ...access };
}
