import { NextResponse } from "next/server";

import { githubFetch } from "@/lib/server/githubApp";
import {
  parseBranch,
  requireCompanionRepository,
} from "@/lib/server/githubCompanion";
import { githubRouteError } from "@/lib/server/githubRoute";
import { HttpError, requireUser } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BranchPayload = {
  commit?: { sha?: string };
  name?: string;
  protected?: boolean;
};

type CommitPayload = {
  author?: { avatar_url?: string; login?: string } | null;
  commit?: {
    author?: { date?: string; name?: string } | null;
    message?: string;
  };
  html_url?: string;
  sha?: string;
};

type PullPayload = {
  additions?: number;
  base?: { ref?: string };
  body?: string | null;
  changed_files?: number;
  comments?: number;
  created_at?: string;
  deletions?: number;
  draft?: boolean;
  head?: { ref?: string };
  html_url?: string;
  merged_at?: string | null;
  number?: number;
  state?: string;
  title?: string;
  updated_at?: string;
  user?: { avatar_url?: string; login?: string } | null;
};

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const { owner, repo, repository, token } = await requireCompanionRepository(
      request,
      user.id
    );
    const branch = parseBranch(
      new URL(request.url).searchParams,
      repository.default_branch
    );
    const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const branches = await githubFetch<BranchPayload[]>(
      `${repositoryPath}/branches?per_page=100`,
      { authToken: token }
    );
    if (branches.length && !branches.some((item) => item.name === branch)) {
      throw new HttpError(404, "GitHub branch not found");
    }
    const [commits, pullRequests] = await Promise.all([
      branches.length
        ? githubFetch<CommitPayload[]>(
            `${repositoryPath}/commits?sha=${encodeURIComponent(branch)}&per_page=30`,
            { authToken: token }
          )
        : Promise.resolve([]),
      githubFetch<PullPayload[]>(
        `${repositoryPath}/pulls?state=all&sort=updated&direction=desc&per_page=30`,
        { authToken: token }
      ),
    ]);

    return NextResponse.json({
      branch,
      branches: branches
        .filter((item) => item.name && item.commit?.sha)
        .map((item) => ({
          name: item.name,
          protected: item.protected === true,
          sha: item.commit?.sha,
        })),
      commits: commits
        .filter((item) => item.sha && item.commit?.message)
        .map((item) => ({
          author: item.author?.login || item.commit?.author?.name || "Unknown",
          avatarUrl: item.author?.avatar_url || null,
          committedAt: item.commit?.author?.date || null,
          htmlUrl: item.html_url || null,
          message: item.commit?.message || "Commit",
          sha: item.sha,
        })),
      pullRequests: pullRequests
        .filter((item) => item.number && item.title)
        .map((item) => ({
          additions: Number(item.additions || 0),
          author: item.user?.login || "Unknown",
          avatarUrl: item.user?.avatar_url || null,
          baseBranch: item.base?.ref || repository.default_branch,
          bodyPreview: item.body?.slice(0, 280) || null,
          changedFiles: Number(item.changed_files || 0),
          commentCount: Number(item.comments || 0),
          createdAt: item.created_at || null,
          deletions: Number(item.deletions || 0),
          draft: item.draft === true,
          headBranch: item.head?.ref || "",
          htmlUrl: item.html_url || null,
          merged: Boolean(item.merged_at),
          number: item.number,
          state: item.state === "closed" ? "closed" : "open",
          title: item.title,
          updatedAt: item.updated_at || null,
        })),
      repository: {
        archived: repository.archived === true,
        defaultBranch: repository.default_branch,
        description: repository.description || null,
        fullName: repository.full_name || `${owner}/${repo}`,
        htmlUrl: repository.html_url || `https://github.com/${owner}/${repo}`,
        isPrivate: repository.private === true,
        language: repository.language || null,
        stars: Number(repository.stargazers_count || 0),
      },
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub repository preview");
  }
}
