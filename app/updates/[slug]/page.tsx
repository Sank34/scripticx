import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("updates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const update = data as {
    slug: string;
    title: string;
    date: string;
    tag: "new" | "fix" | "improved" | null;
    content: string;
  } | null;

  if (!update) notFound();

  const tagStyle =
    update.tag === "new"
      ? "bg-emerald-100 text-emerald-700"
      : update.tag === "fix"
      ? "bg-amber-100 text-amber-700"
      : update.tag === "improved"
      ? "bg-blue-100 text-blue-700"
      : "bg-zinc-100 text-zinc-700";

  const tagLabel =
    update.tag === "new"
      ? "New"
      : update.tag === "fix"
      ? "Fix"
      : update.tag === "improved"
      ? "Improved"
      : null;

  return (
    <article className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        {update.tag && (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${tagStyle}`}
          >
            {tagLabel}
          </span>
        )}
        <span>{update.date}</span>
      </div>

      <Markdown>{update.content}</Markdown>
    </article>
  );
}
