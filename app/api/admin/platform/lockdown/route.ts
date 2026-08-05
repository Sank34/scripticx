import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stringField,
} from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    const body = jsonObject(await readJsonBody(request, 8_000));
    if (typeof body.enabled !== "boolean") {
      throw new HttpError(400, "Invalid lockdown state");
    }
    const message = stringField(
      body.message || "Maintenance",
      { min: 3, max: 500 }
    );
    const now = new Date().toISOString();

    const { data, error } = await createAdminSupabase()
      .from("platform_settings")
      .upsert({
        id: "global",
        lockdown_enabled: body.enabled,
        lockdown_message: message,
        lockdown_enabled_at: body.enabled ? now : null,
        lockdown_enabled_by: body.enabled ? user.id : null,
        updated_at: now,
      })
      .select("lockdown_enabled, lockdown_message, lockdown_enabled_at, updated_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update lockdown mode:", error);
    return NextResponse.json({ error: "Could not update lockdown mode" }, { status: 500 });
  }
}
