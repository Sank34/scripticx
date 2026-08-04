import { supabase } from "@/lib/supabase";

import {
  attentionSignature,
  normalizeTaskLink,
  type AdminTask,
  type AdminTaskBoard,
  type AdminTaskInput,
  type AttentionDismissal,
} from "@/lib/adminTasks";

import type { AttentionItem } from "@/lib/adminOverview";

const TASKS_TABLE = "admin_tasks";
const DISMISSALS_TABLE = "admin_attention_dismissals";

const TASK_COLUMNS =
  "id, title, description, link, severity, done, completed_at, created_at";

async function fetchTasks(): Promise<AdminTask[]> {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select(TASK_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as AdminTask[];
}

async function fetchDismissals(): Promise<AttentionDismissal[]> {
  const { data, error } = await supabase
    .from(DISMISSALS_TABLE)
    .select("item_id, signature");

  if (error) throw error;

  return (data ?? []) as AttentionDismissal[];
}

export async function fetchAdminTaskBoard(): Promise<AdminTaskBoard> {
  const [tasks, dismissals] = await Promise.all([fetchTasks(), fetchDismissals()]);

  return { dismissals, tasks };
}

function payload(input: AdminTaskInput) {
  return {
    description: input.description?.trim() || null,
    link: normalizeTaskLink(input.link),
    severity: input.severity,
    title: input.title.trim(),
  };
}

export async function createAdminTask(input: AdminTaskInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from(TASKS_TABLE)
    .insert([{ ...payload(input), created_by: user?.id ?? null }]);

  if (error) throw error;
}

export async function updateAdminTask(
  id: string,
  input: AdminTaskInput
): Promise<void> {
  const { error } = await supabase
    .from(TASKS_TABLE)
    .update({ ...payload(input), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setAdminTaskDone(id: string, done: boolean): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(TASKS_TABLE)
    .update({ completed_at: done ? now : null, done, updated_at: now })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAdminTask(id: string): Promise<void> {
  const { error } = await supabase.from(TASKS_TABLE).delete().eq("id", id);

  if (error) throw error;
}

export async function dismissAttentionItem(item: AttentionItem): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from(DISMISSALS_TABLE).upsert(
    {
      dismissed_at: new Date().toISOString(),
      dismissed_by: user?.id ?? null,
      item_id: item.id,
      signature: attentionSignature(item),
    },
    { onConflict: "item_id" }
  );

  if (error) throw error;
}

export async function restoreAttentionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from(DISMISSALS_TABLE)
    .delete()
    .eq("item_id", itemId);

  if (error) throw error;
}
