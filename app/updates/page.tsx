import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabaseServer";
import { UpdatesEmptyState } from "./empty-state";

export const dynamic = "force-dynamic";

export default async function UpdatesIndex() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("updates")
    .select("slug")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const slug = (data as { slug: string } | null)?.slug;

  if (!slug) {
    return <UpdatesEmptyState />;
  }

  redirect(`/updates/${slug}`);
}
