import { NextResponse } from "next/server";

import {
  createAdminSupabase,
  createServerSupabase,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

async function removeAvatarFiles(
  admin: ReturnType<typeof createAdminSupabase>,
  prefix: string
) {
  const bucket = admin.storage.from("avatars");
  const paths: string[] = [];

  async function collect(currentPrefix: string) {
    const { data, error } = await bucket.list(currentPrefix, { limit: 1000 });
    if (error) throw error;

    for (const entry of data || []) {
      const path = `${currentPrefix}/${entry.name}`;
      if (entry.id) {
        paths.push(path);
      } else {
        await collect(path);
      }
    }
  }

  await collect(prefix);
  if (!paths.length) return;

  const { error } = await bucket.remove(paths);
  if (error) throw error;
}

export async function DELETE(request: Request, context: RouteContext) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { userId } = await context.params;
  const authClient = createServerSupabase();
  const {
    data: { user: actor },
    error: actorError,
  } = await authClient.auth.getUser(token);

  if (actorError || !actor) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (actor.id === userId) {
    return NextResponse.json(
      { error: "Administrators cannot delete their own account here" },
      { status: 400 }
    );
  }

  let admin: ReturnType<typeof createAdminSupabase>;
  try {
    admin = createAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server configuration error" },
      { status: 503 }
    );
  }

  const { data: actorProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle<{ role: string | null }>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (actorProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    await removeAvatarFiles(admin, userId);

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    const { error: profileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDeleteError) {
      console.error("Auth user deleted, but profile cleanup failed:", profileDeleteError);
    }

    return NextResponse.json({
      deleted: true,
      profileCleanupPending: Boolean(profileDeleteError),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete user" },
      { status: 500 }
    );
  }
}
