import { NextResponse } from "next/server";

import { isEmailWorkerConfigured } from "@/lib/mail/workerClient";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = createAdminSupabase();
    const [settingsResult, dataResult, realtimeResult] = await Promise.all([
      admin
        .from("platform_settings")
        .select("lockdown_enabled, lockdown_message, lockdown_enabled_at, updated_at")
        .eq("id", "global")
        .maybeSingle(),
      admin.from("updates").select("id", { count: "exact", head: true }),
      admin.from("notifications").select("id", { count: "exact", head: true }),
    ]);

    const { data, error } = settingsResult;

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return NextResponse.json(buildStatusPayload({
        databaseOk: !dataResult.error,
        lockdownEnabled: false,
        realtimeOk: !realtimeResult.error,
      }));
    }
    if (error) throw error;

    return NextResponse.json(
      {
        ...buildStatusPayload({
          databaseOk: !dataResult.error,
          lockdownEnabled: data?.lockdown_enabled || false,
          realtimeOk: !realtimeResult.error,
        }),
        message: data?.lockdown_message || null,
        enabledAt: data?.lockdown_enabled_at || null,
        updatedAt: data?.updated_at || null,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Could not read platform status:", error);
    return NextResponse.json({ error: "Could not read platform status" }, { status: 500 });
  }
}

function buildStatusPayload({
  databaseOk,
  lockdownEnabled,
  realtimeOk,
}: {
  databaseOk: boolean;
  lockdownEnabled: boolean;
  realtimeOk: boolean;
}) {
  const mailOk = isEmailWorkerConfigured();
  const degraded = !databaseOk || !realtimeOk || !mailOk || lockdownEnabled;
  return {
    checkedAt: new Date().toISOString(),
    lockdownEnabled,
    overall: degraded ? "degraded" : "operational",
    services: [
      { id: "platform", status: lockdownEnabled ? "degraded" : "operational" },
      { id: "data", status: databaseOk ? "operational" : "outage" },
      { id: "realtime", status: realtimeOk ? "operational" : "degraded" },
      { id: "support", status: mailOk ? "operational" : "degraded" },
    ],
  };
}
