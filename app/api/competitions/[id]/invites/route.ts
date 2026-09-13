import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { competitionId } from "@/lib/server/competitionService";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
  stringField,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { data, error } = await createAdminSupabase()
      .from("competition_invites")
      .select("id, label, expires_at, max_uses, uses_count, created_at, revoked_at")
      .eq("competition_id", competitionId(id))
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ invites: data || [] });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not list competition invitations:", error);
    return NextResponse.json({ error: "Could not list invitations" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAdmin(request);
    const { id } = await context.params;
    const body = jsonObject(await readJsonBody(request, 8_000));
    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const label = stringField(body.label || "Invitation", { min: 1, max: 100 });
    const maxUses =
      body.maxUses === null || body.maxUses === undefined || body.maxUses === ""
        ? null
        : Math.round(Number(body.maxUses));
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 10000)) {
      throw new HttpError(400, "Maximum uses is invalid");
    }
    const expiresAt =
      typeof body.expiresAt === "string" && body.expiresAt
        ? new Date(body.expiresAt).toISOString()
        : null;

    const { data, error } = await createAdminSupabase()
      .from("competition_invites")
      .insert({
        competition_id: competitionId(id),
        created_by: user.id,
        expires_at: expiresAt,
        label,
        max_uses: maxUses,
        token_hash: tokenHash,
      })
      .select("id, label, expires_at, max_uses, uses_count, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ invite: data, token }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not create competition invitation:", error);
    return NextResponse.json({ error: "Could not create invitation" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = jsonObject(await readJsonBody(request, 4_000));
    const inviteId = stringField(body.inviteId, { min: 1, max: 100 });
    const { error } = await createAdminSupabase()
      .from("competition_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("competition_id", competitionId(id));
    if (error) throw error;
    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not revoke competition invitation:", error);
    return NextResponse.json({ error: "Could not revoke invitation" }, { status: 500 });
  }
}
