import "server-only";

import { createAdminSupabase } from "@/lib/supabaseServer";

export type SystemJobName = "email" | "notifications";

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown job failure";
  return message.slice(0, 2_000);
}

export async function startSystemJob(job: SystemJobName) {
  const { data, error } = await createAdminSupabase()
    .from("system_job_runs")
    .insert({ job, status: "running" })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error(`Could not create ${job} job receipt:`, error);
    return null;
  }
  return data.id;
}

export async function finishSystemJob(
  runId: string | null,
  outcome:
    | { status: "failed"; error: unknown }
    | { status: "succeeded"; result: Record<string, unknown> }
) {
  if (!runId) return;
  const patch = outcome.status === "succeeded"
    ? {
        completed_at: new Date().toISOString(),
        error: null,
        result: outcome.result,
        status: "succeeded",
      }
    : {
        completed_at: new Date().toISOString(),
        error: safeError(outcome.error),
        result: {},
        status: "failed",
      };
  const { error } = await createAdminSupabase()
    .from("system_job_runs")
    .update(patch)
    .eq("id", runId);
  if (error) console.error("Could not complete job receipt:", error);
}
