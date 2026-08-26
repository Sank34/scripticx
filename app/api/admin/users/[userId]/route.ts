import { NextResponse } from "next/server";

import {
  createAdminSupabase,
  createServerSupabase,
} from "@/lib/supabaseServer";
import { normalizeOnboardingUsername } from "@/lib/onboarding";
import { normalizeProfilePronouns } from "@/lib/profile-pronouns";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

type AdminContext = {
  actorId: string;
  admin: ReturnType<typeof createAdminSupabase>;
};

async function authorizeAdmin(request: Request): Promise<AdminContext | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const authClient = createServerSupabase();
  const {
    data: { user: actor },
    error: actorError,
  } = await authClient.auth.getUser(token);

  if (actorError || !actor) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminSupabase>;
  try {
    admin = createAdminSupabase();
  } catch (error) {
    console.error("Admin client configuration error:", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const { data: actorProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle<{ role: string | null }>();

  if (profileError) {
    console.error("Could not verify administrator role:", profileError);
    return NextResponse.json({ error: "Could not verify administrator role" }, { status: 500 });
  }
  if (actorProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return { actorId: actor.id, admin };
}

function parsePoints(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1_000_000_000, Math.trunc(parsed))) : 0;
}

function isHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const { userId } = await context.params;
  const authorization = await authorizeAdmin(request);
  if (authorization instanceof NextResponse) return authorization;
  const { actorId, admin } = authorization;

  if (actorId === userId) {
    return NextResponse.json(
      { error: "Administrators cannot delete their own account here" },
      { status: 400 }
    );
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
    console.error("Could not delete user:", error);
    return NextResponse.json(
      { error: "Could not delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const authorization = await authorizeAdmin(request);
  if (authorization instanceof NextResponse) return authorization;
  const { actorId, admin } = authorization;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const username = normalizeOnboardingUsername(String(formData.get("username") || ""));
  const bioValue = String(formData.get("bio") || "").trim();
  const pronouns = normalizeProfilePronouns(String(formData.get("pronouns") || ""));
  const role = String(formData.get("role") || "user") === "admin" ? "admin" : "user";
  const banned = String(formData.get("banned")) === "true";
  const totalScore = parsePoints(formData.get("total_score"));
  const rewardPoints = parsePoints(formData.get("reward_points"));
  let avatarUrl = String(formData.get("avatar_url") || "").trim();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  if (bioValue.length > 500) {
    return NextResponse.json({ error: "Bio must be 500 characters or fewer" }, { status: 400 });
  }
  if (!isHttpUrl(avatarUrl)) {
    return NextResponse.json({ error: "Avatar URL must use HTTP or HTTPS" }, { status: 400 });
  }
  if (actorId === userId && (role !== "admin" || banned)) {
    return NextResponse.json(
      { error: "Administrators cannot remove or suspend their own access" },
      { status: 400 }
    );
  }

  const { data: usernameOwner, error: usernameError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle<{ id: string }>();

  if (usernameError) {
    return NextResponse.json({ error: usernameError.message }, { status: 500 });
  }
  if (usernameOwner) {
    return NextResponse.json({ error: "Username is already in use" }, { status: 409 });
  }

  const avatarEntry = formData.get("avatar");
  if (avatarEntry instanceof File && avatarEntry.size > 0) {
    const allowedTypes = new Map([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
    ]);
    const extension = allowedTypes.get(avatarEntry.type);
    if (!extension || avatarEntry.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Avatar must be a PNG, JPEG, or WebP image up to 5 MB" },
        { status: 400 }
      );
    }

    const storagePath = `${userId}/admin/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(storagePath, avatarEntry, {
        cacheControl: "3600",
        contentType: avatarEntry.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    avatarUrl = admin.storage.from("avatars").getPublicUrl(storagePath).data.publicUrl;
  }

  const { data: updatedUser, error: updateError } = await admin
    .from("profiles")
    .update({
      avatar_url: avatarUrl || null,
      banned,
      bio: bioValue || null,
      pronouns,
      reward_points: rewardPoints,
      role,
      total_score: totalScore,
      username,
    })
    .eq("id", userId)
    .select("id, username, avatar_url, banner_url, bio, pronouns, equipped_rewards, role, banned, total_score, reward_points")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ user: updatedUser });
}
