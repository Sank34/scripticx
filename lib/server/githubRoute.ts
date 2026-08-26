import "server-only";

import { NextResponse } from "next/server";

import { GitHubApiError } from "@/lib/server/githubApp";
import { HttpError } from "@/lib/server/requestSecurity";

export function githubRouteError(error: unknown, fallback: string) {
  if (error instanceof HttpError || error instanceof GitHubApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
