import { createClient, type Session } from "@supabase/supabase-js";

import {
  listSavedAccounts,
  removeSavedAccount,
  saveAccountSession,
  type SavedScripticXAccount,
} from "@/lib/account-switcher";
import { supabase } from "@/lib/supabase";

function createTransientAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey: `scripticx-transient-${crypto.randomUUID()}`,
      },
    }
  );
}

async function resolveSavedSession(account: SavedScripticXAccount) {
  const temporaryClient = createTransientAuthClient();
  const { data, error } = await temporaryClient.auth.setSession({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  if (error) throw error;
  if (!data.session) throw new Error("Session unavailable");
  return data.session;
}

async function revokeSession(session: Session | null) {
  if (!session) return;

  try {
    const temporaryClient = createTransientAuthClient();
    const { data, error } = await temporaryClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error || !data.session) return;
    await temporaryClient.auth.signOut({ scope: "local" });
  } catch {
    // The account is already removed from this device. A failed remote revoke
    // must not undo a successful switch to the fallback account.
  }
}

export async function activateSavedAccount(
  account: SavedScripticXAccount
): Promise<Session> {
  // Validate and refresh the saved tokens in an isolated client first. An
  // invalid saved account can therefore never clear the active app session.
  const resolvedSession = await resolveSavedSession(account);
  const { data, error } = await supabase.auth.setSession({
    access_token: resolvedSession.access_token,
    refresh_token: resolvedSession.refresh_token,
  });

  if (error) throw error;
  if (!data.session) throw new Error("Session unavailable");

  saveAccountSession(data.session, {
    avatarUrl: account.avatarUrl,
    nickname: account.nickname,
    username: account.username,
  });
  return data.session;
}

export async function logoutSavedAccount(account: SavedScripticXAccount) {
  try {
    const temporaryClient = createTransientAuthClient();
    const { data, error } = await temporaryClient.auth.setSession({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });
    if (!error && data.session) {
      await temporaryClient.auth.signOut({ scope: "local" });
    }
  } catch {
    // The saved session may already be expired or offline. Removing its local
    // token pair still logs this account out on the current device.
  } finally {
    // Removing the only local copy is sufficient to log this account out on
    // the current device even if its remote session has already expired.
    removeSavedAccount(account.userId);
  }
}

export type LogoutAccountResult = {
  account: SavedScripticXAccount;
  session: Session;
} | null;

export async function logoutCurrentAccount(
  currentUserId: string
): Promise<LogoutAccountResult> {
  const { data: currentData } = await supabase.auth.getSession();
  const currentSession = currentData.session;
  const fallbackAccounts = listSavedAccounts().filter(
    (account) => account.userId !== currentUserId
  );

  if (fallbackAccounts.length > 0) {
    let lastError: unknown = null;

    for (const account of fallbackAccounts) {
      try {
        const session = await activateSavedAccount(account);
        removeSavedAccount(currentUserId);
        void revokeSession(currentSession);
        return { account, session };
      } catch (error) {
        lastError = error;
      }
    }

    // Keep the current account active if none of the saved alternatives can
    // be validated. This prevents a failed switch from stranding the user on
    // the login screen.
    throw lastError || new Error("No saved account could be activated");
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  removeSavedAccount(currentUserId);
  return null;
}
