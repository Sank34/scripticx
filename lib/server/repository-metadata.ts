import { cookies } from "next/headers";

import { translations } from "@/lib/i18n";
import { normalizeLocale } from "@/lib/language";
import { createPageMetadata, metadataExcerpt } from "@/lib/metadata";
import { repositoryHref } from "@/lib/repositories";
import { createServerSupabase } from "@/lib/supabaseServer";

async function getRepositoryMetadataLocale() {
  return normalizeLocale((await cookies()).get("locale")?.value) ?? "en";
}

export async function getRepositoryListMetadata() {
  const locale = await getRepositoryMetadataLocale();
  const copy = translations[locale].repositories;

  return createPageMetadata({
    title: copy.title,
    description: copy.metadata.listDescription,
    path: "/repos",
    noIndex: true,
    locale,
  });
}

export async function getRepositoryMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [locale, { id }] = await Promise.all([getRepositoryMetadataLocale(), params]);
  const copy = translations[locale].repositories;
  const { data: repository } = await createServerSupabase({ fetchTimeoutMs: 3000 })
    .from("snippets")
    .select("title, description")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  const publicDescription = copy.metadata.publicDescription;
  return createPageMetadata({
    title: repository ? repository.title?.trim() || copy.untitled : copy.metadata.repository,
    description: repository
      ? metadataExcerpt(repository.description, publicDescription) || publicDescription
      : copy.unavailable,
    path: repositoryHref(id),
    section: copy.title,
    noIndex: !repository,
    locale,
  });
}
