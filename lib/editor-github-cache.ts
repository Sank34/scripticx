import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { githubClientRequest } from "@/lib/github-client";
import type { GitHubProjectLink, GitHubRepository } from "@/lib/github-integration";

export type GitHubRepositoryPayload = {
  configured: boolean;
  installations: Array<{
    accountLogin: string;
    accountType: string;
    id: number;
    repositorySelection: string;
    suspended: boolean;
  }>;
  link: GitHubProjectLink | null;
  repositories: GitHubRepository[];
};

export type GitHubBranchSummary = { name: string; protected: boolean; sha: string };

const cachePolicy = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export function editorGitHubRepositories(userId: string | null, projectId: string | null = null) {
  return queryOptions({
    ...cachePolicy,
    queryKey: ["editor-github", userId, "repositories", projectId] as const,
    enabled: Boolean(userId),
    // Let a tab's in-flight read populate the cache even if its panel is hidden.
    queryFn: () => githubClientRequest<GitHubRepositoryPayload>(
      `/api/github/repositories${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  });
}

export function editorGitHubBranches(userId: string | null, projectId: string | null, connected: boolean) {
  return queryOptions({
    ...cachePolicy,
    queryKey: ["editor-github", userId, "branches", projectId] as const,
    enabled: Boolean(userId && projectId && connected),
    queryFn: async () => {
      const result = await githubClientRequest<{ branches: GitHubBranchSummary[] }>(
        `/api/github/branches?projectId=${encodeURIComponent(projectId!)}`,
      );
      return result.branches;
    },
  });
}

export function editorGitHubProjectLink(userId: string | null, projectId: string | null) {
  return queryOptions({
    ...cachePolicy,
    queryKey: ["editor-github", userId, "project-link", projectId] as const,
    enabled: Boolean(userId && projectId),
    queryFn: () => githubClientRequest<{ link: GitHubProjectLink | null }>(
      `/api/github/project-link?projectId=${encodeURIComponent(projectId!)}`,
    ),
  });
}

export async function cacheEditorGitHubProjectLink(client: QueryClient, userId: string | null, projectId: string, link: GitHubProjectLink | null) {
  const { queryKey } = editorGitHubProjectLink(userId, projectId);
  await client.cancelQueries({ queryKey });
  client.setQueryData(queryKey, { link });
}
