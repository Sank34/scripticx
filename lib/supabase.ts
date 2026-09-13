import { createClient } from "@supabase/supabase-js";

const AUTH_FETCH_TIMEOUT_MS = 4_000;

function resilientSupabaseFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (!requestUrl.includes("/auth/v1/")) return fetch(input, init);

  const timeoutSignal = AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: resilientSupabaseFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
