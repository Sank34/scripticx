import { createClient } from "@supabase/supabase-js";
import { resilientSupabaseFetch, supabaseAuthLock } from "@/lib/supabase-transport";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function createSupabaseClient() {
  return createClient(url, key, {
    global: {
      fetch: resilientSupabaseFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      lock: supabaseAuthLock,
    },
  });
}

const browserGlobal = globalThis as typeof globalThis & {
  scripticxSupabaseClient?: {
    url: string;
    key: string;
    client: ReturnType<typeof createSupabaseClient>;
  };
};
const cached = typeof window !== "undefined" ? browserGlobal.scripticxSupabaseClient : undefined;

export const supabase = cached?.url === url && cached.key === key
  ? cached.client
  : createSupabaseClient();

if (typeof window !== "undefined") {
  // Fast Refresh reevaluates modules while the previous client's refresh timer remains active.
  browserGlobal.scripticxSupabaseClient = { url, key, client: supabase };
}
