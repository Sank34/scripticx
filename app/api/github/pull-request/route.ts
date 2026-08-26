import { NextResponse } from "next/server";

import { githubFetch, requireProjectLink } from "@/lib/server/githubApp";
import { githubRouteError } from "@/lib/server/githubRoute";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 12_000));
    const projectId = stringField(body.projectId, { min: 1, max: 100 });
    const title = stringField(body.title, { min: 1, max: 240 });
    const description =
      body.description === undefined
        ? ""
        : stringField(body.description, { min: 0, max: 8_000, trim: false });
    const { link, token } = await requireProjectLink(user.id, projectId);

    if (link.current_branch === link.default_branch) {
      throw new HttpError(400, "Create or switch to a feature branch first");
    }

    const pullRequest = await githubFetch<{
      html_url?: string;
      number?: number;
      state?: string;
      title?: string;
    }>(
      `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/pulls`,
      {
        authToken: token,
        method: "POST",
        body: {
          base: link.default_branch,
          body: description,
          head: link.current_branch,
          title,
        },
      }
    );

    if (!pullRequest.number || !pullRequest.html_url) {
      throw new HttpError(502, "GitHub did not create the pull request");
    }

    return NextResponse.json(
      {
        pullRequest: {
          number: pullRequest.number,
          state: pullRequest.state || "open",
          title: pullRequest.title || title,
          url: pullRequest.html_url,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return githubRouteError(error, "Could not create GitHub pull request");
  }
}
