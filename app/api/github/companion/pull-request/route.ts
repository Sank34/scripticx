import { NextResponse } from "next/server";

import { githubFetch } from "@/lib/server/githubApp";
import {
  parsePullNumber,
  previewPatch,
  requireCompanionRepository,
} from "@/lib/server/githubCompanion";
import { githubRouteError } from "@/lib/server/githubRoute";
import { requireUser } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PullDetailPayload = {
  additions?: number;
  base?: { ref?: string };
  body?: string | null;
  changed_files?: number;
  comments?: number;
  commits?: number;
  created_at?: string;
  deletions?: number;
  draft?: boolean;
  head?: { ref?: string };
  html_url?: string;
  mergeable?: boolean | null;
  merged_at?: string | null;
  number?: number;
  review_comments?: number;
  state?: string;
  title?: string;
  updated_at?: string;
  user?: { avatar_url?: string; login?: string } | null;
};

type PullFilePayload = {
  additions?: number;
  blob_url?: string;
  changes?: number;
  deletions?: number;
  filename?: string;
  patch?: string;
  previous_filename?: string;
  status?: string;
};

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const { owner, repo, token } = await requireCompanionRepository(request, user.id);
    const number = parsePullNumber(new URL(request.url).searchParams);
    const basePath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`;
    const [pullRequest, files] = await Promise.all([
      githubFetch<PullDetailPayload>(basePath, { authToken: token }),
      githubFetch<PullFilePayload[]>(`${basePath}/files?per_page=100`, {
        authToken: token,
      }),
    ]);

    return NextResponse.json({
      pullRequest: {
        additions: Number(pullRequest.additions || 0),
        author: pullRequest.user?.login || "Unknown",
        avatarUrl: pullRequest.user?.avatar_url || null,
        baseBranch: pullRequest.base?.ref || "",
        body: pullRequest.body || null,
        changedFiles: Number(pullRequest.changed_files || files.length),
        commentCount:
          Number(pullRequest.comments || 0) + Number(pullRequest.review_comments || 0),
        commitCount: Number(pullRequest.commits || 0),
        createdAt: pullRequest.created_at || null,
        deletions: Number(pullRequest.deletions || 0),
        draft: pullRequest.draft === true,
        files: files.map((file) => ({
          additions: Number(file.additions || 0),
          blobUrl: file.blob_url || null,
          changes: Number(file.changes || 0),
          deletions: Number(file.deletions || 0),
          filename: file.filename || "unknown",
          patch: previewPatch(file.patch),
          previousFilename: file.previous_filename || null,
          status: file.status || "modified",
        })),
        headBranch: pullRequest.head?.ref || "",
        htmlUrl: pullRequest.html_url || null,
        mergeable: pullRequest.mergeable ?? null,
        merged: Boolean(pullRequest.merged_at),
        number: pullRequest.number || number,
        state: pullRequest.state === "closed" ? "closed" : "open",
        title: pullRequest.title || `Pull request #${number}`,
        updatedAt: pullRequest.updated_at || null,
      },
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub pull request preview");
  }
}
