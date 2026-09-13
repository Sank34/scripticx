import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

const SESSION_SNAPSHOT_TTL_MS = 750;

let sessionRequest: Promise<SessionResult> | null = null;
let sessionSnapshot: SessionResult | null = null;
let sessionSnapshotAt = 0;

/**
 * Deduplicates the many session reads that happen while the client shell is
 * mounting. This is especially important in React Strict Mode, where effects
 * intentionally run twice and Supabase protects token refreshes with a
 * navigator lock.
 */
export function getSupabaseSession(options: { fresh?: boolean } = {}) {
  const now = Date.now();
  if (
    !options.fresh &&
    sessionSnapshot &&
    now - sessionSnapshotAt < SESSION_SNAPSHOT_TTL_MS
  ) {
    return Promise.resolve(sessionSnapshot);
  }
  if (sessionRequest) return sessionRequest;

  sessionRequest = supabase.auth
    .getSession()
    .then((result) => {
      sessionSnapshot = result;
      sessionSnapshotAt = Date.now();
      return result;
    })
    .finally(() => {
      sessionRequest = null;
    });

  return sessionRequest;
}

export async function getSupabaseSessionWithTimeout(timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      getSupabaseSession(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Session request timed out")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function updateSupabaseSessionSnapshot(session: Session | null) {
  sessionSnapshot = session
    ? { data: { session }, error: null }
    : { data: { session: null }, error: null };
  sessionSnapshotAt = Date.now();
}

export function clearSupabaseSessionSnapshot() {
  sessionSnapshot = null;
  sessionSnapshotAt = 0;
}
