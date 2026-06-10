import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
} from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerSupabase();
  const { data: classData } = await supabase
    .from("classes")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (!classData) return createNotFoundMetadata("Clasa");

  const className = classData.name?.trim() || "Clasă";

  return createPageMetadata({
    title: `${className} — clasă`,
    description: `Temele, membrii și activitatea clasei „${className}” pe ScripticX.`,
    path: `/classes/${id}`,
    noIndex: true,
  });
}

export default function ClassLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
