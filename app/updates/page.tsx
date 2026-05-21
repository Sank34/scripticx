import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabaseServer";

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
    return (
      <div className="max-w-2xl space-y-3 py-12 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">No updates yet</h1>
        <p className="text-sm text-zinc-500">
          Check back soon for the latest changes.
        </p>
      </div>
    );
  }

  redirect(`/updates/${slug}`);
}
