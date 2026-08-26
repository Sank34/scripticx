export type EmailConfirmationState = {
  email_confirmed_at?: string | null;
};

export const emailVerificationBroadcastChannel =
  "scripticx.emailVerification.v1";
export const emailVerificationStorageKey =
  "scripticx.emailVerification.completed.v1";
export const pendingEmailVerificationStorageKey =
  "scripticx.emailVerification.pending.v1";
export const pendingEmailVerificationCookie =
  "scripticx_pending_email_verification";

const PENDING_EMAIL_VERIFICATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type EmailVerificationSignal = {
  completedAt: string;
  userId: string;
};

export type PendingEmailVerification = {
  createdAt: string;
  email: string;
  userId: string | null;
};

export function isEmailVerified(
  user: EmailConfirmationState | null | undefined
) {
  return Boolean(user?.email_confirmed_at);
}

function writePendingVerificationCookie(pending: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = pending
    ? `${pendingEmailVerificationCookie}=1; Path=/; Max-Age=${PENDING_EMAIL_VERIFICATION_MAX_AGE_SECONDS}; SameSite=Lax`
    : `${pendingEmailVerificationCookie}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readPendingEmailVerification() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      pendingEmailVerificationStorageKey
    );
    if (!raw) return null;

    const pending = JSON.parse(raw) as PendingEmailVerification;
    const createdAt = Date.parse(pending.createdAt);
    const expired =
      !Number.isFinite(createdAt) ||
      Date.now() - createdAt >
        PENDING_EMAIL_VERIFICATION_MAX_AGE_SECONDS * 1_000;

    if (!pending.email || expired) {
      clearPendingEmailVerification();
      return null;
    }

    return pending;
  } catch {
    clearPendingEmailVerification();
    return null;
  }
}

export function storePendingEmailVerification(
  email: string,
  userId: string | null
) {
  if (typeof window === "undefined") return;

  const pending: PendingEmailVerification = {
    createdAt: new Date().toISOString(),
    email: email.trim(),
    userId,
  };

  try {
    window.localStorage.setItem(
      pendingEmailVerificationStorageKey,
      JSON.stringify(pending)
    );
  } catch {
    // The cookie still protects document navigation when storage is blocked.
  }
  writePendingVerificationCookie(true);
}

export function clearPendingEmailVerification() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(pendingEmailVerificationStorageKey);
    } catch {
      // Clearing the navigation cookie is still enough to release the gate.
    }
  }
  writePendingVerificationCookie(false);
}

export function publishEmailVerificationCompleted(userId: string) {
  if (typeof window === "undefined") return;

  const signal: EmailVerificationSignal = {
    completedAt: new Date().toISOString(),
    userId,
  };

  try {
    window.localStorage.setItem(
      emailVerificationStorageKey,
      JSON.stringify(signal)
    );
  } catch {
    // BroadcastChannel still synchronizes open tabs when storage is blocked.
  }

  if (typeof window.BroadcastChannel === "undefined") return;

  const channel = new window.BroadcastChannel(
    emailVerificationBroadcastChannel
  );
  channel.postMessage(signal);
  channel.close();
}
