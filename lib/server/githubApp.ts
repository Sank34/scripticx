import "server-only";

import {
  createHash,
  createHmac,
  createSign,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  GITHUB_MANAGED_FILE_BYTES,
  GITHUB_MANAGED_FILE_LIMIT,
  GITHUB_MANAGED_TOTAL_BYTES,
  isSupportedGitHubTextPath,
  type GitHubProjectLink,
  type GitHubRemoteFile,
  type GitHubRepository,
} from "@/lib/github-integration";
import { HttpError } from "@/lib/server/requestSecurity";

const GITHUB_API_ROOT = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";

type GitHubInstallation = {
  account?: { id?: number; login?: string; type?: string };
  id?: number;
  repository_selection?: string;
  suspended_at?: string | null;
};

type GitHubApiRepository = {
  default_branch?: string;
  description?: string | null;
  full_name?: string;
  id?: number;
  name?: string;
  owner?: { login?: string };
  private?: boolean;
  updated_at?: string | null;
};

type GitHubTreeItem = {
  path?: string;
  sha?: string;
  size?: number;
  type?: string;
};

type GitHubProjectLinkRow = {
  current_branch: string;
  default_branch: string;
  file_hashes: Record<string, string> | null;
  head_sha: string | null;
  installation_id: number;
  last_synced_at: string | null;
  owner: string;
  remote_head_sha: string | null;
  repo: string;
  repository_id: number;
  sync_status: string | null;
  tracked_paths: string[] | null;
};

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function getGitHubAppConfig() {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  const encodedPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64?.trim();
  if (!appId || !slug || !encodedPrivateKey) {
    throw new GitHubApiError(503, "GitHub App is not configured");
  }

  let privateKey: string;
  try {
    privateKey = Buffer.from(encodedPrivateKey, "base64").toString("utf8");
  } catch {
    throw new GitHubApiError(503, "GitHub App private key is invalid");
  }
  if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    throw new GitHubApiError(503, "GitHub App private key is invalid");
  }

  return { appId, slug, privateKey };
}

export function createGitHubAppJwt(nowSeconds = Math.floor(Date.now() / 1000)) {
  const { appId, privateKey } = getGitHubAppConfig();
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({ iat: nowSeconds - 30, exp: nowSeconds + 9 * 60, iss: appId })
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
}

export async function githubFetch<T>(
  path: string,
  options: {
    authToken: string;
    body?: unknown;
    method?: "GET" | "POST" | "PATCH" | "DELETE";
  }
): Promise<T> {
  const response = await fetch(`${GITHUB_API_ROOT}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${options.authToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "ScripticX-Editor",
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message || "GitHub request failed")
        : `GitHub request failed (${response.status})`;
    throw new GitHubApiError(response.status, message, payload);
  }
  return payload as T;
}

export async function getGitHubInstallation(installationId: number) {
  return githubFetch<GitHubInstallation>(`/app/installations/${installationId}`, {
    authToken: createGitHubAppJwt(),
  });
}

export async function createInstallationToken(installationId: number) {
  const payload = await githubFetch<{ token?: string; expires_at?: string }>(
    `/app/installations/${installationId}/access_tokens`,
    { authToken: createGitHubAppJwt(), method: "POST" }
  );
  if (!payload.token) throw new GitHubApiError(502, "GitHub did not issue an installation token");
  return payload.token;
}

export function createInstallState() {
  const state = randomBytes(32).toString("base64url");
  return { state, hash: hashInstallState(state) };
}

export function hashInstallState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function buildGitHubInstallationUrl(state: string) {
  const { slug } = getGitHubAppConfig();
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`;
}

export function verifyGitHubWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export async function requireOwnedProject(userId: string, projectId: string) {
  const { data, error } = await createAdminSupabase()
    .from("snippets")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Project not found");
  return data;
}

export async function requireInstallationForUser(userId: string, installationId: number) {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("github_installation_users")
    .select("installation_id, github_installations!inner(suspended_at)")
    .eq("installation_id", installationId)
    .eq("user_id", userId)
    .maybeSingle<{
      installation_id: number;
      github_installations: { suspended_at: string | null } | { suspended_at: string | null }[];
    }>();
  if (error) throw error;
  if (!data) throw new HttpError(403, "GitHub installation access denied");
  const installation = Array.isArray(data.github_installations)
    ? data.github_installations[0]
    : data.github_installations;
  if (installation?.suspended_at) throw new HttpError(409, "GitHub installation is suspended");
  return createInstallationToken(installationId);
}

export async function getProjectLink(userId: string, projectId: string) {
  const { data, error } = await createAdminSupabase()
    .from("github_project_links")
    .select(
      "installation_id, repository_id, owner, repo, default_branch, current_branch, head_sha, remote_head_sha, sync_status, tracked_paths, file_hashes, last_synced_at"
    )
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle<GitHubProjectLinkRow>();
  if (error) throw error;
  return data || null;
}

export function publicProjectLink(row: GitHubProjectLinkRow): GitHubProjectLink {
  const allowedStatuses = new Set(["clean", "behind", "conflict", "unknown"]);
  return {
    branch: row.current_branch,
    defaultBranch: row.default_branch,
    fileHashes: row.file_hashes || {},
    headSha: row.head_sha,
    installationId: Number(row.installation_id),
    lastSyncedAt: row.last_synced_at,
    owner: row.owner,
    remoteHeadSha: row.remote_head_sha,
    repo: row.repo,
    repositoryId: Number(row.repository_id),
    syncStatus: allowedStatuses.has(row.sync_status || "")
      ? (row.sync_status as GitHubProjectLink["syncStatus"])
      : "unknown",
    trackedPaths: row.tracked_paths || [],
  };
}

export async function requireProjectLink(userId: string, projectId: string) {
  await requireOwnedProject(userId, projectId);
  const link = await getProjectLink(userId, projectId);
  if (!link) throw new HttpError(404, "Project is not connected to GitHub");
  const token = await requireInstallationForUser(userId, Number(link.installation_id));
  return { link, token };
}

export async function listInstallationRepositories(installationId: number, token: string) {
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const payload = await githubFetch<{ repositories?: GitHubApiRepository[] }>(
      `/installation/repositories?per_page=100&page=${page}`,
      { authToken: token }
    );
    const pageRepositories = payload.repositories || [];
    for (const repository of pageRepositories) {
      if (!repository.id || !repository.name || !repository.owner?.login) continue;
      repositories.push({
        defaultBranch: repository.default_branch || "main",
        description: repository.description || null,
        fullName: repository.full_name || `${repository.owner.login}/${repository.name}`,
        id: repository.id,
        installationId,
        isPrivate: repository.private === true,
        name: repository.name,
        owner: repository.owner.login,
        updatedAt: repository.updated_at || null,
      });
    }
    if (pageRepositories.length < 100) break;
  }
  return repositories;
}

export function encodeGitRef(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

export function hashProjectFiles(files: GitHubRemoteFile[]) {
  return Object.fromEntries(
    files.map((file) => [
      file.path,
      createHash("sha256").update(file.content).digest("hex"),
    ])
  );
}

export async function getBranchHead(input: {
  branch: string;
  owner: string;
  repo: string;
  token: string;
}) {
  const ref = await githubFetch<{ object?: { sha?: string } }>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/heads/${encodeGitRef(input.branch)}`,
    { authToken: input.token }
  );
  const sha = ref.object?.sha;
  if (!sha) throw new GitHubApiError(502, "GitHub branch has no head commit");
  return sha;
}

export async function readRepositoryFiles(input: {
  branch: string;
  owner: string;
  repo: string;
  token: string;
}) {
  const headSha = await getBranchHead(input);
  const commit = await githubFetch<{ tree?: { sha?: string } }>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/commits/${headSha}`,
    { authToken: input.token }
  );
  if (!commit.tree?.sha) throw new GitHubApiError(502, "GitHub commit has no tree");
  const tree = await githubFetch<{ tree?: GitHubTreeItem[]; truncated?: boolean }>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/trees/${commit.tree.sha}?recursive=1`,
    { authToken: input.token }
  );
  if (tree.truncated) throw new GitHubApiError(413, "Repository tree is too large to import safely");

  const candidates = (tree.tree || []).filter(
    (item) =>
      item.type === "blob" &&
      Boolean(item.path && item.sha) &&
      (item.size ?? 0) <= GITHUB_MANAGED_FILE_BYTES &&
      isSupportedGitHubTextPath(item.path || "")
  );
  if (candidates.length > GITHUB_MANAGED_FILE_LIMIT) {
    throw new GitHubApiError(413, `Repository contains more than ${GITHUB_MANAGED_FILE_LIMIT} supported files`);
  }

  const files: GitHubRemoteFile[] = [];
  let totalBytes = 0;
  for (let index = 0; index < candidates.length; index += 8) {
    const batch = candidates.slice(index, index + 8);
    const payloads = await Promise.all(
      batch.map((item) =>
        githubFetch<{ content?: string; encoding?: string }>(
          `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/blobs/${item.sha}`,
          { authToken: input.token }
        )
      )
    );
    payloads.forEach((payload, payloadIndex) => {
      const item = batch[payloadIndex];
      if (!item?.path || payload.encoding !== "base64" || !payload.content) return;
      const buffer = Buffer.from(payload.content.replace(/\s/g, ""), "base64");
      totalBytes += buffer.byteLength;
      if (totalBytes > GITHUB_MANAGED_TOTAL_BYTES) {
        throw new GitHubApiError(413, "Repository source files are too large to import safely");
      }
      if (buffer.includes(0)) return;
      files.push({ path: item.path, content: buffer.toString("utf8") });
    });
  }

  return { files, headSha, treeSha: commit.tree.sha };
}
