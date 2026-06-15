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

  if (!problem) return createNotFoundMetadata("Problem");

  const title = localizedMetadataText(
    problem.title_i18n,
    "MiniScript+ Problem"
  );
  const codePrefix =
    problem.code === null || problem.code === undefined
      ? ""
      : `#${problem.code} `;

  return createPageMetadata({
    title: `${codePrefix}${title}`,
    description: metadataExcerpt(
      problem.description_i18n,
      `Solve the “${title}” MiniScript+ problem and validate your solution against automated test cases.`
    ),
    path: `/problems/${id}`,
    keywords: [
      "MiniScript+ problem",
      `${problem.difficulty || "programming"} coding problem`,
      title,
    ],
  });
}

export default function ProblemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
