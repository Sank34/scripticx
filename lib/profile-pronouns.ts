export const MAX_PROFILE_PRONOUNS_LENGTH = 40;

export function normalizeProfilePronouns(
  value: string | null | undefined
): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) return null;

  return Array.from(normalized)
    .slice(0, MAX_PROFILE_PRONOUNS_LENGTH)
    .join("");
}
