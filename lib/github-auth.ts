import type { User } from "@supabase/supabase-js";

export const GITHUB_AUTH_SCOPES = "read:user user:email";

export type GitHubIdentitySummary = {
  avatarUrl: string | null;
  username: string | null;
};

function getString(
  source: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

export function getGitHubIdentitySummary(
  user: Pick<User, "identities" | "user_metadata"> | null | undefined
): GitHubIdentitySummary | null {
  const identity = user?.identities?.find(
    (candidate) => candidate.provider === "github"
  );
  if (!identity) return null;

  const identityData = identity.identity_data as
    | Record<string, unknown>
    | undefined;
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;

  return {
    username:
      getString(identityData, ["user_name", "preferred_username", "login"]) ||
      getString(metadata, ["user_name", "preferred_username"]),
    avatarUrl:
      getString(identityData, ["avatar_url", "picture"]) ||
      getString(metadata, ["avatar_url", "picture"]),
  };
}
