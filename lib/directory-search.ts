import { buildUsernameSearchPattern } from "@/lib/profile-search";
import { supabase } from "@/lib/supabase";

export const searchScopes = ["all", "repositories", "users"] as const;
export type SearchScope = (typeof searchScopes)[number];

export function parseSearchScope(value: string | null): SearchScope {
  return value === "repositories" || value === "users" ? value : "all";
}

export function directorySearchHref(term: string, scope: SearchScope = "all") {
  const params = new URLSearchParams();
  if (term.trim()) params.set("q", term.trim());
  if (scope !== "all") params.set("type", scope);
  return params.size ? `/search?${params}` : "/search";
}

export async function searchProfiles(term: string, offset: number, limit: number, signal: AbortSignal) {
  const pattern = buildUsernameSearchPattern(term.replace(/^@/, ""));
  if (!pattern) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, equipped_rewards")
    .ilike("username", pattern)
    .order("username")
    .order("id")
    .range(offset, offset + limit - 1)
    .abortSignal(signal);
  if (error) throw error;
  return data;
}

function literalPattern(term: string) {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function searchPublicRepositories(term: string, offset: number, limit: number, signal: AbortSignal) {
  const separator = term.indexOf("/");
  const owner = separator > 0 ? term.slice(0, separator).trim() : "";
  const phrase = (owner ? term.slice(separator + 1) : term).trim().slice(0, 100);
  if (!phrase) return [];

  let query = supabase.from("snippets").select("id, title, description, user_id").eq("is_public", true);

  if (owner) {
    const { data: profile, error } = await supabase
      .from("profiles").select("id").eq("username", owner).abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!profile) return [];
    query = query.eq("user_id", profile.id).ilike("title", `%${literalPattern(phrase)}%`);
  } else {
    // Quote the PostgREST filter value separately from the SQL LIKE escaping.
    const pattern = literalPattern(phrase).replace(/[\\"]/g, (character) => `\\${character}`);
    query = query.or(`title.ilike."%${pattern}%",description.ilike."%${pattern}%"`);
  }

  const { data: repositories, error } = await query
    .order("title").order("id").range(offset, offset + limit - 1).abortSignal(signal);
  if (error) throw error;
  if (!repositories.length) return [];

  const { data: owners, error: ownersError } = await supabase
    .from("profiles").select("id, username")
    .in("id", [...new Set(repositories.map((repo) => repo.user_id))])
    .abortSignal(signal);
  if (ownersError) throw ownersError;
  const usernames = new Map(owners.map((profile) => [profile.id, profile.username]));

  return repositories.map((repo) => ({ ...repo, owner: usernames.get(repo.user_id) }));
}
