import { NavigatorLockAcquireTimeoutError } from "@supabase/supabase-js";

export const AUTH_FETCH_TIMEOUT_MS = 15_000;
export const AUTH_SESSION_TIMEOUT_MS = 60_000;

export function resilientSupabaseFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!new URL(requestUrl).pathname.startsWith("/auth/v1/")) return fetch(input, init);

  const callerSignal = init.signal ?? (input instanceof Request ? input.signal : undefined);
  const timeoutSignal = AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS);
  const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

export async function supabaseAuthLock<Result>(
  name: string,
  acquireTimeout: number,
  operation: () => Promise<Result>
): Promise<Result> {
  if (typeof navigator === "undefined" || !navigator.locks) return operation();

  const controller = new AbortController();
  const timer = acquireTimeout === 0
    ? undefined
    : setTimeout(() => controller.abort(), AUTH_SESSION_TIMEOUT_MS);
  let acquired = false;
  try {
    return await navigator.locks.request(
      name,
      acquireTimeout === 0
        ? { mode: "exclusive", ifAvailable: true }
        : { mode: "exclusive", signal: controller.signal },
      async (lock) => {
        if (!lock) throw new NavigatorLockAcquireTimeoutError("The authentication session is busy");
        acquired = true;
        clearTimeout(timer);
        return operation();
      }
    );
  } catch (error) {
    // A busy tab must keep ownership while its token refresh is still running.
    if (!acquired && controller.signal.aborted) {
      throw new NavigatorLockAcquireTimeoutError("Timed out waiting for the authentication session");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
