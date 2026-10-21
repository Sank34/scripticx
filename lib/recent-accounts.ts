export const RECENT_ACCOUNTS_STORAGE_KEY = "scripticx-recent-accounts-v1";
export const RECENT_ACCOUNTS_EVENT = "scripticx-recent-accounts-changed";
export const MAX_RECENT_ACCOUNTS = 5;

export type RecentAccount = {
  userId: string;
  email: string;
  nickname: string;
  username: string | null;
  avatarUrl: string | null;
  lastUsedAt: string;
};

function identity(value: unknown): RecentAccount | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.userId !== "string" || !row.userId.trim() || row.userId.length > 128) return null;
  if (typeof row.email !== "string" || row.email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(row.email.trim())) return null;
  if (typeof row.lastUsedAt !== "string" || !Number.isFinite(Date.parse(row.lastUsedAt))) return null;
  // Project fields explicitly so credentials can never enter this registry.
  return {
    userId: row.userId,
    email: row.email.trim(),
    nickname: typeof row.nickname === "string" && row.nickname.trim() ? row.nickname.trim().slice(0, 40) : row.email.trim().split("@")[0],
    username: typeof row.username === "string" ? row.username.slice(0, 100) : null,
    avatarUrl: typeof row.avatarUrl === "string" && row.avatarUrl.length <= 2048 ? row.avatarUrl : null,
    lastUsedAt: new Date(row.lastUsedAt).toISOString(),
  };
}

function normalizeAccounts(values: unknown[]): RecentAccount[] {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  return values.map(identity).filter((account): account is RecentAccount => account !== null)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
    .filter(account => {
      const email = account.email.toLowerCase();
      if (seenIds.has(account.userId) || seenEmails.has(email)) return false;
      seenIds.add(account.userId);
      seenEmails.add(email);
      return true;
    }).slice(0, MAX_RECENT_ACCOUNTS);
}

export function parseRecentAccounts(raw: string | null): RecentAccount[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? normalizeAccounts(value) : [];
  } catch { return []; }
}

export function mergeRecentAccount(accounts: RecentAccount[], account: RecentAccount) {
  return normalizeAccounts([account, ...accounts]);
}

export function listRecentAccounts(): RecentAccount[] {
  try {
    return typeof window === "undefined" ? [] : parseRecentAccounts(window.localStorage.getItem(RECENT_ACCOUNTS_STORAGE_KEY));
  } catch { return []; }
}

function writeRecentAccounts(accounts: RecentAccount[]) {
  try {
    if (typeof window === "undefined") return;
    const serialized = JSON.stringify(accounts);
    if (window.localStorage.getItem(RECENT_ACCOUNTS_STORAGE_KEY) === serialized) return;
    window.localStorage.setItem(RECENT_ACCOUNTS_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(RECENT_ACCOUNTS_EVENT));
  } catch {
    // Remembering an identity must never prevent authentication or sign-out.
  }
}

export function rememberRecentAccount(account: RecentAccount) {
  writeRecentAccounts(mergeRecentAccount(listRecentAccounts(), account));
}

export function forgetRecentAccount(userId: string) {
  writeRecentAccounts(listRecentAccounts().filter(account => account.userId !== userId));
}

export function seedRecentAccounts(accounts: Array<Omit<RecentAccount, "lastUsedAt"> & { updatedAt: string }>) {
  const candidates = accounts.map(account => ({ ...account, lastUsedAt: account.updatedAt }));
  writeRecentAccounts(normalizeAccounts([...listRecentAccounts(), ...candidates]));
}
