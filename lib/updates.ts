import { supabase } from "@/lib/supabase";

export type UpdateTag = "new" | "fix" | "improved";

export type LocalizedString = Record<string, string>;

export type UpdateEntry = {
  id?: string;
  slug: string;
  title_i18n: LocalizedString;
  content_i18n: LocalizedString;
  date: string;
  tag: UpdateTag | null;
  created_at?: string;
};

type FetchUpdatesOptions = {
  includeScheduled?: boolean;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchUpdates(options: FetchUpdatesOptions = {}): Promise<UpdateEntry[]> {
  let query = supabase
    .from("updates")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!options.includeScheduled) query = query.lte("date", todayKey());
  const { data, error } = await query;

  if (error) throw error;

  return (data as UpdateEntry[]) || [];
}

export async function fetchUpdate(slug: string): Promise<UpdateEntry | null> {
  const { data, error } = await supabase
    .from("updates")
    .select("*")
    .eq("slug", slug)
    .lte("date", todayKey())
    .maybeSingle();

  if (error) throw error;

  return (data as UpdateEntry | null) || null;
}

export async function fetchLatestSlug(): Promise<string | null> {
  const { data, error } = await supabase
    .from("updates")
    .select("slug")
    .lte("date", todayKey())
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (data as { slug: string } | null)?.slug ?? null;
}
