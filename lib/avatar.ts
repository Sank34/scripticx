export const DEFAULT_AVATAR_URL = "/avatars/default-pfp.svg";

const EMPTY_VALUES = new Set(["null", "undefined"]);

export function resolveAvatarUrl(avatarUrl?: string | null) {
  if (typeof avatarUrl !== "string") return DEFAULT_AVATAR_URL;

  const text = avatarUrl.trim();
  if (!text || EMPTY_VALUES.has(text.toLowerCase())) return DEFAULT_AVATAR_URL;

  return text;
}
