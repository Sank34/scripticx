import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
} from "@/lib/metadata";
import { createAdminSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminSupabase();
  const { data: classData } = await supabase
    .from("classes")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (!classData) return createNotFoundMetadata("Class");

  const className = classData.name?.trim() || "Class";

  return createPageMetadata({
    title: `${className} — Class`,
    description: `Assignments, members, and learning activity for the “${className}” class on ScripticX.`,
    path: `/classes/${id}`,
    noIndex: true,
  });
}

export default function ClassLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
