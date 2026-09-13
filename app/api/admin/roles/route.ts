import { NextResponse } from "next/server";
import { createAuthenticatedServerSupabase } from "@/lib/supabaseServer";
import { HttpError, jsonObject, readJsonBody, requireUser } from "@/lib/server/requestSecurity";
import { isPermission } from "@/lib/permissions";

async function client(request: Request) {
  const session = await requireUser(request);
  if (session.role !== "admin") throw new HttpError(403, "Only full administrators can manage roles");
  return createAuthenticatedServerSupabase(session.accessToken);
}
function failure(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Role management failed", error);
  return NextResponse.json({ error: "Could not save or load roles. Check that the roles migration is applied." }, { status: 500 });
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, "Invalid identifier");
  return value;
}
export async function GET(request: Request) {
  try {
    const db = await client(request);
    const url = new URL(request.url);
    if (url.searchParams.has("search")) {
      const search = (url.searchParams.get("search") || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,60}$/.test(search)) return NextResponse.json({ users: [] });
      const { data, error } = await db.from("profiles").select("id, username, avatar_url, equipped_rewards, role, platform_user_roles(role_id)").ilike("username", `%${search.replace(/_/g, "\\_")}%`).order("username").limit(30);
      if (error) throw error;
      return NextResponse.json({ users: data });
    }
    if (url.searchParams.has("members")) {
      const roleId = uuid(url.searchParams.get("members"));
      const offset = Math.max(0, Math.min(1_000_000, Number(url.searchParams.get("offset")) || 0));
      const { data, error, count } = await db.from("platform_user_roles").select("user_id, profiles(id, username, avatar_url, equipped_rewards, role)", { count: "exact" }).eq("role_id", roleId).order("user_id").range(offset, offset + 49);
      if (error) throw error;
      return NextResponse.json({ members: data, count });
    }
    const { data, error } = await db.from("platform_roles").select("*, platform_user_roles(count)").order("name");
    if (error) throw error;
    return NextResponse.json({ roles: data });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const db = await client(request);
    const body = jsonObject(await readJsonBody(request, 16_384));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!name || name.length > 60 || /^(admin|user)$/i.test(name) || description.length > 500 || !Array.isArray(body.permissions) || !body.permissions.every(isPermission)) throw new HttpError(400, "Invalid role name or permissions");
    const payload = { name, description, permissions: [...new Set(body.permissions)] };
    const query = body.id ? db.from("platform_roles").update(payload).eq("id", uuid(body.id)) : db.from("platform_roles").insert(payload);
    const { data, error } = await query.select().single();
    if (error?.code === "23505") throw new HttpError(409, "A role with this name already exists");
    if (error) throw error;
    return NextResponse.json({ role: data });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    const db = await client(request);
    const body = jsonObject(await readJsonBody(request, 2048));
    const user_id = uuid(body.userId), role_id = uuid(body.roleId);
    if (typeof body.assigned !== "boolean") throw new HttpError(400, "Invalid assignment");
    const { error } = body.assigned ? await db.from("platform_user_roles").upsert({ user_id, role_id }) : await db.from("platform_user_roles").delete().eq("user_id", user_id).eq("role_id", role_id);
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const db = await client(request);
    const body = jsonObject(await readJsonBody(request, 2048));
    const { error } = await db.from("platform_roles").delete().eq("id", uuid(body.id));
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) { return failure(error); }
}
