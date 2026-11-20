import { supabase } from "@/lib/supabase";
import type { ProjectEntry } from "@/lib/editor-project";

type ProjectSavePayload = {
  title: string;
  description: string;
  code: string;
  files: ProjectEntry[];
  is_public: boolean;
};

export async function persistEditorProject({ userId, savedId, projectIdOverride, payload, updateVisibility = true, promoteRepository = false, templateSourceId }: {
  userId: string;
  savedId: string | null;
  projectIdOverride?: string;
  payload: ProjectSavePayload;
  updateVisibility?: boolean;
  promoteRepository?: boolean;
  templateSourceId?: string;
}) {
  const targetProjectId = projectIdOverride ?? savedId;
  if (targetProjectId) {
    const { is_public, ...content } = payload;
    const update = {
      ...content,
      ...(updateVisibility ? { is_public } : {}),
      ...(promoteRepository ? { is_live_workspace: false } : {}),
      ...(templateSourceId ? { template_source_id: templateSourceId } : {}),
    };
    const { data, error } = await supabase.from("snippets")
      .update(update).eq("id", targetProjectId).eq("user_id", userId)
      .select("id, is_public").maybeSingle();
    if (data?.id || error) return { id: data?.id ?? null, isPublic: data ? data.is_public === true : undefined, error };
    // A GitHub import must update the row carrying the durable repository link.
    if (projectIdOverride) return { id: null, error: new Error("The connected project could not be updated") };
  }

  const { data, error } = await supabase.from("snippets")
    .insert([{ user_id: userId, ...payload, ...(templateSourceId ? { template_source_id: templateSourceId } : {}) }]).select("id").single();
  return { id: data?.id ?? null, error };
}
