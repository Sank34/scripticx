import type { Session } from "@supabase/supabase-js";

const ACCOUNT_STORAGE_KEY = "scripticx-saved-accounts-v1";
export const ACCOUNT_STORAGE_EVENT = "scripticx-saved-accounts-changed";

export type SavedScripticXAccount = {
  accessToken: string;
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  expiresAt: number | null;
  nickname: string;
  refreshToken: string;
  updatedAt: string;
  userId: string;
  username: string | null;
};

type AccountDetails = {
  avatarUrl?: string | null;
  nickname?: string | null;
  username?: string | null;
};

function isSavedAccount(value: unknown): value is SavedScripticXAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Partial<SavedScripticXAccount>;
  return (
    typeof account.userId === "string" &&
    typeof account.email === "string" &&
    typeof account.nickname === "string" &&
    typeof account.accessToken === "string" &&
    typeof account.refreshToken === "string" &&
    typeof account.createdAt === "string" &&
    typeof account.updatedAt === "string"
  );
}

export function parseSavedAccounts(raw: string | null): SavedScripticXAccount[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    return parsed.filter((account): account is SavedScripticXAccount => {
      if (!isSavedAccount(account) || seen.has(account.userId)) return false;
      seen.add(account.userId);
      return true;
    });
  } catch {
    return [];
  }
}

function defaultNickname(
  session: Session,
  details: AccountDetails,
  existing?: SavedScripticXAccount
) {
  const metadata = session.user.user_metadata || {};
  const metadataName =
    typeof metadata.preferred_username === "string"
      ? metadata.preferred_username
      : typeof metadata.user_name === "string"
        ? metadata.user_name
        : null;

  return (
    details.nickname?.trim() ||
    existing?.nickname ||
    details.username?.trim() ||
    metadataName?.trim() ||
    session.user.email?.split("@")[0] ||
    "ScripticX"
  ).slice(0, 40);
}

export function mergeSavedAccount(
  accounts: SavedScripticXAccount[],
  session: Session,
  details: AccountDetails = {}
): SavedScripticXAccount[] {
  const now = new Date().toISOString();
  const existing = accounts.find((account) => account.userId === session.user.id);
  const next: SavedScripticXAccount = {
    userId: session.user.id,
    email: session.user.email || existing?.email || "",
    nickname: defaultNickname(session, details, existing),
    username: details.username ?? existing?.username ?? null,
    avatarUrl: details.avatarUrl ?? existing?.avatarUrl ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  return [
    next,
    ...accounts.filter((account) => account.userId !== session.user.id),
  ];
}

export function removeSavedAccountFromList(
  accounts: SavedScripticXAccount[],
  userId: string
) {
  return accounts.filter((account) => account.userId !== userId);
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function notifyAccountStorage() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_STORAGE_EVENT));
  }
}

export function listSavedAccounts() {
  const storage = browserStorage();
  return storage ? parseSavedAccounts(storage.getItem(ACCOUNT_STORAGE_KEY)) : [];
}

export function saveAccountSession(
  session: Session,
  details: AccountDetails = {}
) {
  const storage = browserStorage();
  if (!storage) return [];

  const current = listSavedAccounts();
  const next = mergeSavedAccount(current, session, details);
  const serialized = JSON.stringify(next);

  if (serialized !== storage.getItem(ACCOUNT_STORAGE_KEY)) {
    storage.setItem(ACCOUNT_STORAGE_KEY, serialized);
    notifyAccountStorage();
  }

  return next;
}

export function removeSavedAccount(userId: string) {
  const storage = browserStorage();
  if (!storage) return [];

  const next = removeSavedAccountFromList(listSavedAccounts(), userId);
  storage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(next));
  notifyAccountStorage();
  return next;
}

