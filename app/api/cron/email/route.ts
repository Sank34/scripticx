import { NextResponse } from "next/server";

import { processEmailQueueWithWorker } from "@/lib/mail/workerClient";
import { finishSystemJob, startSystemJob } from "@/lib/server/jobRuns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Email cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const runId = await startSystemJob("email");
  try {
    const result = await processEmailQueueWithWorker();
    await finishSystemJob(runId, { status: "succeeded", result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Email worker failed:", error);
    await finishSystemJob(runId, { status: "failed", error });
    return NextResponse.json({ error: "Email worker failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
