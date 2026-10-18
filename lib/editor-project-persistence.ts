import { supabase } from "@/lib/supabase";
import type { ProjectEntry } from "@/lib/editor-project";

type ProjectSavePayload = {
  title: string;
  description: string;
  code: string;
  files: ProjectEntry[];
  is_public: boolean;
};

export async function persistEditorProject({ userId, savedId, projectIdOverride, payload }: {
  userId: string;
  savedId: string | null;
  projectIdOverride?: string;
  payload: ProjectSavePayload;
}) {
  const targetProjectId = projectIdOverride ?? savedId;
  if (targetProjectId) {
    const { data, error } = await supabase.from("snippets")
      .update(payload).eq("id", targetProjectId).eq("user_id", userId)
      .select("id").maybeSingle();
    if (data?.id || error) return { id: data?.id ?? null, error };
    // A GitHub import must update the row carrying the durable repository link.
    if (projectIdOverride) return { id: null, error: new Error("The connected project could not be updated") };
  }

  const { data, error } = await supabase.from("snippets")
    .insert([{ user_id: userId, ...payload }]).select("id").single();
  return { id: data?.id ?? null, error };
}
