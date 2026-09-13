import { getSupabaseSessionWithTimeout } from "@/lib/supabase-session";

export async function githubClientRequest<T>(
  path: string,
  init: RequestInit = {}
) {
  const { data } = await getSupabaseSessionWithTimeout(6_000);
  const token = data.session?.access_token;
  if (!token) throw new Error("Authentication required");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || `GitHub request failed (${response.status})`);
  }
  return payload as T;
}
