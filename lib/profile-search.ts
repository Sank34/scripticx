const USERNAME_SEARCH_MAX_LENGTH = 64;

export function normalizeUsernameSearch(query: string) {
  return query
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, USERNAME_SEARCH_MAX_LENGTH);
}

export function buildUsernameSearchPattern(query: string) {
  const normalized = normalizeUsernameSearch(query);
  if (!normalized) return null;

  return `%${normalized.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
