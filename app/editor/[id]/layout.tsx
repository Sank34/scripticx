import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
  metadataExcerpt,
} from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerSupabase();
  const { data: snippet } = await supabase
    .from("snippets")
    .select("title, description, is_public, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!snippet) return createNotFoundMetadata("Project");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", snippet.user_id)
    .maybeSingle();

  const title = snippet.title?.trim() || "ScripticX Project";
  const author = profile?.username ? ` by ${profile.username}` : "";

  return createPageMetadata({
    title: `${title} — ScripticX Project`,
    description: metadataExcerpt(
      snippet.description,
      `Explore the “${title}” programming project${author} on ScripticX.`
    ),
    path: `/editor/${id}`,
    noIndex: !snippet.is_public,
    type: "article",
    keywords: ["ScripticX project", "programming project", "code sharing", title],
  });
}

export default function SnippetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
