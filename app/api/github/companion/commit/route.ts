import { NextResponse } from "next/server";

import { githubFetch } from "@/lib/server/githubApp";
import {
  parseCommitSha,
  previewPatch,
  requireCompanionRepository,
} from "@/lib/server/githubCompanion";
import { githubRouteError } from "@/lib/server/githubRoute";
import { requireUser } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CommitFilePayload = {
  additions?: number;
  blob_url?: string;
  changes?: number;
  deletions?: number;
  filename?: string;
  patch?: string;
  previous_filename?: string;
  status?: string;
};

type CommitDetailPayload = {
  author?: { avatar_url?: string; login?: string } | null;
  commit?: {
    author?: { date?: string; name?: string } | null;
    message?: string;
  };
  files?: CommitFilePayload[];
  html_url?: string;
  sha?: string;
  stats?: { additions?: number; deletions?: number; total?: number };
};

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const { owner, repo, token } = await requireCompanionRepository(request, user.id);
    const sha = parseCommitSha(new URL(request.url).searchParams);
    const commit = await githubFetch<CommitDetailPayload>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`,
      { authToken: token }
    );

    return NextResponse.json({
      commit: {
        author: commit.author?.login || commit.commit?.author?.name || "Unknown",
        avatarUrl: commit.author?.avatar_url || null,
        committedAt: commit.commit?.author?.date || null,
        files: (commit.files || []).slice(0, 100).map((file) => ({
          additions: Number(file.additions || 0),
          blobUrl: file.blob_url || null,
          changes: Number(file.changes || 0),
          deletions: Number(file.deletions || 0),
          filename: file.filename || "unknown",
          patch: previewPatch(file.patch),
          previousFilename: file.previous_filename || null,
          status: file.status || "modified",
        })),
        htmlUrl: commit.html_url || null,
        message: commit.commit?.message || "Commit",
        sha: commit.sha || sha,
        stats: {
          additions: Number(commit.stats?.additions || 0),
          deletions: Number(commit.stats?.deletions || 0),
          total: Number(commit.stats?.total || 0),
        },
      },
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub commit preview");
  }
}
