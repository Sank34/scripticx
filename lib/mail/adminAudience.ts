import { HttpError, jsonObject } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { UUID_PATTERN } from "@/lib/mail/validation";

type AdminClient = ReturnType<typeof createAdminSupabase>;
type ProfileIdentifier = { id: string; username: string | null };

const MAX_SPECIFIC_USERS = 500;
const LOOKUP_CHUNK_SIZE = 100;

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export function normalizeCampaignUserIdentifiers(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_SPECIFIC_USERS) {
    throw new HttpError(400, "Add between 1 and 500 usernames or user IDs");
  }

  const identifiers = [...new Set(value.map((entry) => {
    if (typeof entry !== "string") {
      throw new HttpError(400, "Usernames and user IDs must be text values");
    }
    const normalized = entry.trim().replace(/^@/, "").toLowerCase();
    if (!normalized || normalized.length > 80 || /[\s,]/.test(normalized)) {
      throw new HttpError(400, "Invalid username or user ID");
    }
    if (normalized.includes("@")) {
      throw new HttpError(400, "Use usernames or user IDs, not email addresses");
    }
    return normalized;
  }))];

  if (!identifiers.length) {
    throw new HttpError(400, "Add at least one username or user ID");
  }
  return identifiers;
}

export async function resolveCampaignAudience(
  admin: AdminClient,
  value: unknown
): Promise<unknown> {
  const audience = jsonObject(value);
  if (audience.type !== "users") return value;

  const source = Array.isArray(audience.identifiers)
    ? audience.identifiers
    : audience.userIds;
  const identifiers = normalizeCampaignUserIdentifiers(source);
  const directIds = identifiers.filter((identifier) => UUID_PATTERN.test(identifier));
  const usernames = identifiers.filter((identifier) => !UUID_PATTERN.test(identifier));
  const resolvedProfiles: ProfileIdentifier[] = [];

  for (const usernameChunk of chunks(usernames, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, username")
      .in("username", usernameChunk)
      .returns<ProfileIdentifier[]>();
    if (error) throw error;
    resolvedProfiles.push(...(data || []));
  }

  const profilesByUsername = new Map(
    resolvedProfiles
      .filter((profile) => profile.username)
      .map((profile) => [profile.username!.toLowerCase(), profile])
  );
  const missingUsernames = usernames.filter(
    (username) => !profilesByUsername.has(username)
  );
  if (missingUsernames.length) {
    const visible = missingUsernames.slice(0, 5).map((username) => `@${username}`).join(", ");
    const remaining = missingUsernames.length - 5;
    throw new HttpError(
      400,
      `User${missingUsernames.length === 1 ? "" : "s"} not found: ${visible}${remaining > 0 ? ` and ${remaining} more` : ""}`
    );
  }

  const resolvedIds = usernames.map((username) => profilesByUsername.get(username)!.id);
  return {
    type: "users",
    userIds: [...new Set([...directIds, ...resolvedIds])],
    identifiers,
  };
}
