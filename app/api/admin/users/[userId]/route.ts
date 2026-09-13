import { requireAdmin, HttpError } from "@/lib/server/requestSecurity";
import { NextResponse } from "next/server";

import {
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { isValidUsername, isValidUsernameInput, normalizeOnboardingUsername } from "@/lib/onboarding";
import { normalizeProfilePronouns } from "@/lib/profile-pronouns";
import { normalizeAdminPoints } from "@/lib/admin-points";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

type AdminContext = {
  actorId: string;
  fullAdmin: boolean;
  admin: ReturnType<typeof createAdminSupabase>;
};

type UserDeletionBlocker = {
  column_name: string;
  constraint_name: string;
  delete_action: "no_action" | "restrict";
  matching_rows: number | string;
  schema_name: string;
  table_name: string;
};

type UserStorageObject = {
  bucket_id: string;
  object_name: string;
};

const STORAGE_OBJECT_PAGE_SIZE = 500;
const MAX_STORAGE_OBJECTS_PER_USER = 50_000;

async function authorizeAdmin(request: Request): Promise<AdminContext | NextResponse> {
  try {
    const session = await requireAdmin(request);
    return { actorId: session.user.id, fullAdmin: session.role === "admin", admin: createAdminSupabase() };
  } catch (error) {
    return NextResponse.json({ error: error instanceof HttpError ? error.message : "Could not verify access" }, { status: error instanceof HttpError ? error.status : 503 });
  }
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

async function getUserDeletionBlockers(
  admin: ReturnType<typeof createAdminSupabase>,
  userId: string
): Promise<UserDeletionBlocker[]> {
  const { data, error } = await admin.rpc("admin_user_deletion_blockers", {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data || []) as UserDeletionBlocker[];
}

async function listUserStorageObjects(
  admin: ReturnType<typeof createAdminSupabase>,
  userId: string
): Promise<UserStorageObject[]> {
  const objects: UserStorageObject[] = [];

  while (true) {
    const { data, error } = await admin.rpc("admin_list_user_storage_objects", {
      p_user_id: userId,
      p_limit: STORAGE_OBJECT_PAGE_SIZE,
      p_offset: objects.length,
    });
    if (error) throw error;

    const page = (data || []) as UserStorageObject[];
    objects.push(...page);
    if (objects.length > MAX_STORAGE_OBJECTS_PER_USER) {
      throw new Error(
        `Account owns more than ${MAX_STORAGE_OBJECTS_PER_USER} storage objects; manual cleanup is required`
      );
    }
    if (page.length < STORAGE_OBJECT_PAGE_SIZE) return objects;
  }
}

async function removeUserStorageObjects(
  admin: ReturnType<typeof createAdminSupabase>,
  objects: UserStorageObject[]
) {
  const byBucket = new Map<string, string[]>();
  for (const object of objects) {
    const paths = byBucket.get(object.bucket_id) || [];
    paths.push(object.object_name);
    byBucket.set(object.bucket_id, paths);
  }

  for (const [bucketId, paths] of byBucket) {
    for (let offset = 0; offset < paths.length; offset += STORAGE_OBJECT_PAGE_SIZE) {
      const { error } = await admin.storage
        .from(bucketId)
        .remove(paths.slice(offset, offset + STORAGE_OBJECT_PAGE_SIZE));
      if (error) throw error;
    }
  }
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: undefined, message: "Could not delete user" };
  }
  const value = error as { code?: unknown; message?: unknown };
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message:
      typeof value.message === "string" && value.message.trim()
        ? value.message
        : "Could not delete user",
  };
}

export async function DELETE(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const authorization = await authorizeAdmin(request);
  if (authorization instanceof NextResponse) return authorization;
  const { actorId, admin, fullAdmin } = authorization;
  if (!fullAdmin) {
    const { data: target, error } = await admin.from("profiles").select("role").eq("id", userId).single();
    const { data: assigned, error: assignedError } = await admin.from("platform_user_roles").select("role_id").eq("user_id", userId).limit(1);
    if (error || assignedError || !target || target.role === "admin" || assigned?.length || userId === actorId) {
      return NextResponse.json({ error: "Only full administrators can modify privileged accounts" }, { status: 403 });
    }
  }

  if (actorId === userId) {
    return NextResponse.json(
      { error: "Administrators cannot delete their own account here" },
      { status: 400 }
    );
  }

  try {
    const blockers = await getUserDeletionBlockers(admin, userId);
    if (blockers.length > 0) {
      return NextResponse.json(
        {
          code: "USER_DELETE_BLOCKED",
          error: "The user is still referenced by protected platform records",
          blockers,
        },
        { status: 409 }
      );
    }

    const storageObjects = await listUserStorageObjects(admin, userId);
    await removeUserStorageObjects(admin, storageObjects);

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
      storageObjectsDeleted: storageObjects.length,
    });
  } catch (error) {
    console.error("Could not delete user:", error);
    const details = errorDetails(error);
    return NextResponse.json(
      { code: details.code, error: details.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const authorization = await authorizeAdmin(request);
  if (authorization instanceof NextResponse) return authorization;
  const { actorId, admin, fullAdmin } = authorization;
  if (!fullAdmin) {
    const { data: target, error } = await admin.from("profiles").select("role").eq("id", userId).single();
    const { data: assigned, error: assignedError } = await admin.from("platform_user_roles").select("role_id").eq("user_id", userId).limit(1);
    if (error || assignedError || !target || target.role === "admin" || assigned?.length || userId === actorId) {
      return NextResponse.json({ error: "Only full administrators can modify privileged accounts" }, { status: 403 });
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const rawUsername = String(formData.get("username") || "").trim();
  if (rawUsername && !isValidUsernameInput(rawUsername)) {
    return NextResponse.json({ error: "Username may contain only letters, numbers, hyphens, and underscores" }, { status: 400 });
  }
  const username = normalizeOnboardingUsername(rawUsername);
  const bioValue = String(formData.get("bio") || "").trim();
  const pronouns = normalizeProfilePronouns(String(formData.get("pronouns") || ""));
  const role = String(formData.get("role") || "user") === "admin" ? "admin" : "user";
  const banned = String(formData.get("banned")) === "true";
  if (!fullAdmin && role !== "user") return NextResponse.json({ error: "Only full administrators can grant admin access" }, { status: 403 });
  const { totalScore, rewardPoints } = normalizeAdminPoints(
    String(formData.get("total_score") || "0"),
    String(formData.get("reward_points") || "0"),
    "available",
  );
  let avatarUrl = String(formData.get("avatar_url") || "").trim();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Username may contain only lowercase letters, numbers, hyphens, and underscores" }, { status: 400 });
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
