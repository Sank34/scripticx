import { NextResponse } from "next/server";

import { getMailConfig, publicMailConfig } from "@/lib/mail/service";
import { isEmailWorkerReady } from "@/lib/mail/workerClient";
import {
  booleanField,
  emailAddress,
  mailMode,
  senderLocalPart,
  senderName,
} from "@/lib/mail/validation";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [config, providerConfigured] = await Promise.all([
      getMailConfig(),
      isEmailWorkerReady(),
    ]);
    return NextResponse.json({ config: publicMailConfig(config, providerConfigured) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not read email configuration:", error);
    return NextResponse.json({ error: "Could not read email configuration" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    await enforceRateLimit({ key: user.id, action: "mail_config_update", limit: 20, windowSeconds: 3600 });
    const body = jsonObject(await readJsonBody(request, 8_000));
    const patch: Record<string, unknown> = { updated_by: user.id };
    if ("senderName" in body) patch.sender_name = senderName(body.senderName);
    if ("senderLocalPart" in body) patch.sender_local_part = senderLocalPart(body.senderLocalPart);
    if ("replyTo" in body) patch.reply_to = emailAddress(body.replyTo, false);
    if ("defaultMode" in body) patch.default_mode = mailMode(body.defaultMode);
    if ("contactNotificationsEnabled" in body) patch.contact_notifications_enabled = booleanField(body.contactNotificationsEnabled, "contact notifications setting");
    if ("transactionalEnabled" in body) patch.transactional_enabled = booleanField(body.transactionalEnabled, "transactional setting");
    if ("marketingEnabled" in body) patch.marketing_enabled = booleanField(body.marketingEnabled, "marketing setting");
    if (Object.keys(patch).length === 1) throw new HttpError(400, "No configuration fields to update");
    const admin = createAdminSupabase();
    const { error } = await admin.from("email_config").update(patch).eq("id", "global");
    if (error) throw error;
    const [config, providerConfigured] = await Promise.all([
      getMailConfig(admin),
      isEmailWorkerReady(),
    ]);
    return NextResponse.json({ config: publicMailConfig(config, providerConfigured) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not update email configuration:", error);
    return NextResponse.json({ error: "Could not update email configuration" }, { status: 500 });
  }
}
