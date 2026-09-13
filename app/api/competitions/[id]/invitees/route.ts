import { NextResponse } from "next/server";

import { competitionId } from "@/lib/server/competitionService";
import {
  HttpError,
  jsonObject,
  readJsonBody,
  requireAdmin,
} from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLocaleLowerCase();
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const safeId = competitionId((await context.params).id);
    const query = new URL(request.url).searchParams.get("q")?.trim().replace(/^@+/, "") || "";
    if (query.length < 2) return NextResponse.json({ users: [] });
    if (query.length > 80) throw new HttpError(400, "Search is too long");
    const admin = createAdminSupabase();
    const pattern = query.replace(/[\\%_]/g, "\\$&");
    const { data: users, error } = await admin.from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${pattern}%`).order("username").limit(20);
    if (error) throw error;
    const ids = (users || []).map((user) => user.id);
    const { data: invited, error: invitedError } = ids.length
      ? await admin.from("competition_invitees").select("user_id")
        .eq("competition_id", safeId).in("user_id", ids)
      : { data: [], error: null };
    if (invitedError) throw invitedError;
    const invitedIds = new Set((invited || []).map((entry) => entry.user_id));
    return NextResponse.json({ users: (users || []).map((user) => ({ ...user, invited: invitedIds.has(user.id) })) });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not search competition invitees:", error);
    return NextResponse.json({ error: "Could not search users" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAdmin(request);
    const { id } = await context.params;
    const safeId = competitionId(id);
    const body = jsonObject(await readJsonBody(request, 100_000));
    const admin = createAdminSupabase();
    if (typeof body.userId === "string") {
      const userId = competitionId(body.userId);
      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("id").eq("id", userId).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new HttpError(404, "User not found");
      const { error } = await admin.from("competition_invitees").upsert({
        competition_id: safeId, user_id: userId, invited_by: user.id,
      }, { onConflict: "competition_id,user_id", ignoreDuplicates: true });
      if (error) throw error;
      return NextResponse.json({ added: 1, missing: [] });
    }
    const input = Array.isArray(body.usernames) ? body.usernames : [];
    const usernames = [...new Set(
      input
        .filter((value): value is string => typeof value === "string")
        .map(normalizeUsername)
        .filter((value) => value.length >= 2 && value.length <= 80)
    )];
    if (!usernames.length || usernames.length > 5_000) {
      throw new HttpError(400, "Provide between 1 and 5,000 usernames");
    }

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, username")
      .not("username", "is", null)
      .limit(10_000);
    if (profilesError) throw profilesError;

    const byUsername = new Map(
      (profiles || [])
        .filter((profile) => typeof profile.username === "string")
        .map((profile) => [normalizeUsername(profile.username), profile.id])
    );
    const matched = usernames
      .map((username) => ({ username, user_id: byUsername.get(username) }))
      .filter((entry): entry is { username: string; user_id: string } => Boolean(entry.user_id));
    const missing = usernames.filter((username) => !byUsername.has(username));

    if (matched.length) {
      const { error } = await admin.from("competition_invitees").upsert(
        matched.map((entry) => ({
          competition_id: safeId,
          invited_by: user.id,
          user_id: entry.user_id,
        })),
        { onConflict: "competition_id,user_id" }
      );
      if (error) throw error;
    }

    return NextResponse.json({
      added: matched.length,
      missing,
      usernames: matched.map((entry) => entry.username),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not import competition invitees:", error);
    return NextResponse.json({ error: "Could not import competition invitees" }, { status: 500 });
  }
}
