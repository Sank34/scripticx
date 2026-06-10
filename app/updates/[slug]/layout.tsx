import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
  localizedMetadataText,
  metadataExcerpt,
} from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();
  const { data: update } = await supabase
    .from("updates")
    .select("title_i18n, content_i18n")
    .eq("slug", slug)
    .maybeSingle();

  if (!update) return createNotFoundMetadata("Noutatea");

  const title = localizedMetadataText(update.title_i18n, "Noutăți ScripticX");

  return createPageMetadata({
    title,
    description: metadataExcerpt(
      update.content_i18n,
      "Descoperă cele mai recente funcționalități și îmbunătățiri ScripticX."
    ),
    path: `/updates/${slug}`,
    type: "article",
    keywords: ["noutăți ScripticX", "actualizare platformă", title],
  });
}

export default function UpdateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
