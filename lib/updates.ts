import { supabase } from "@/lib/supabase";

export type UpdateTag = "new" | "fix" | "improved";

export type UpdateEntry = {
  id?: string;
  slug: string;
  title: string;
  date: string;
  tag: UpdateTag | null;
  content: string;
  created_at?: string;
};

export async function fetchUpdates(): Promise<UpdateEntry[]> {
  const { data } = await supabase
    .from("updates")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data as UpdateEntry[]) || [];
}

export async function fetchUpdate(slug: string): Promise<UpdateEntry | null> {
  const { data } = await supabase
    .from("updates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as UpdateEntry | null) || null;
}

export async function fetchLatestSlug(): Promise<string | null> {
  const { data } = await supabase
    .from("updates")
    .select("slug")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { slug: string } | null)?.slug ?? null;
}
