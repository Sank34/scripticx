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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerSupabase();
  const { data: problem } = await supabase
    .from("problems")
    .select("code, title_i18n, description_i18n, difficulty")
    .eq("id", id)
    .maybeSingle();

  if (!problem) return createNotFoundMetadata("Problema");

  const title = localizedMetadataText(
    problem.title_i18n,
    "Problemă MiniScript+"
  );
  const codePrefix =
    problem.code === null || problem.code === undefined
      ? ""
      : `#${problem.code} `;

  return createPageMetadata({
    title: `${codePrefix}${title}`,
    description: metadataExcerpt(
      problem.description_i18n,
      `Rezolvă problema „${title}” în MiniScript+ și verifică soluția prin cazuri de test.`
    ),
    path: `/problems/${id}`,
    keywords: [
      "problemă MiniScript+",
      `problemă ${problem.difficulty || "programare"}`,
      title,
    ],
  });
}

export default function ProblemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
