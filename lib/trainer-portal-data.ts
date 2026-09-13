import { supabase } from "@/lib/supabase";
import {
  clampDuration,
  WORKSHOP_RESOURCE_KINDS,
  WORKSHOP_SECTION_KINDS,
  WORKSHOP_STATUSES,
  type Workshop,
  type WorkshopComment,
  type WorkshopResource,
  type WorkshopResourceKind,
  type WorkshopSection,
  type WorkshopSectionKind,
  type WorkshopStatus,
} from "@/lib/trainer-portal";

export type WorkshopResourceRow = {
  id: string;
  kind: string | null;
  title: string | null;
  url: string | null;
  note: string | null;
  sort_order: number | null;
};

export type WorkshopSectionRow = {
  id: string;
  title: string | null;
  kind: string | null;
  duration_minutes: number | null;
  led_by: string | null;
  notes: string | null;
  done: boolean | null;
  sort_order: number | null;
  workshop_section_resources: { resource_id: string }[] | null;
};

export type WorkshopCommentRow = {
  id: string;
  author_name: string | null;
  body: string | null;
  resolved: boolean | null;
  created_at: string | null;
};

export type WorkshopRow = {
  id: string;
  title: string | null;
  summary: string | null;
  status: string | null;
  starts_at: string | null;
  location: string | null;
  audience: string | null;
  trainers: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  workshop_resources: WorkshopResourceRow[] | null;
  workshop_sections: WorkshopSectionRow[] | null;
  workshop_comments: WorkshopCommentRow[] | null;
};

const WORKSHOP_SELECT = `
  id, title, summary, status, starts_at, location, audience, trainers,
  created_at, updated_at,
  workshop_resources ( id, kind, title, url, note, sort_order ),
  workshop_sections (
    id, title, kind, duration_minutes, led_by, notes, done, sort_order,
    workshop_section_resources ( resource_id )
  ),
  workshop_comments ( id, author_name, body, resolved, created_at )
`;

function text(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function byOrder(
  a: { sort_order: number | null },
  b: { sort_order: number | null }
) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

function mapResource(row: WorkshopResourceRow): WorkshopResource {
  return {
    id: row.id,
    kind: WORKSHOP_RESOURCE_KINDS.includes(row.kind as WorkshopResourceKind)
      ? (row.kind as WorkshopResourceKind)
      : "link",
    title: text(row.title),
    url: text(row.url),
    note: text(row.note),
  };
}

function mapSection(row: WorkshopSectionRow): WorkshopSection {
  return {
    id: row.id,
    title: text(row.title),
    kind: WORKSHOP_SECTION_KINDS.includes(row.kind as WorkshopSectionKind)
      ? (row.kind as WorkshopSectionKind)
      : "talk",
    durationMinutes: clampDuration(row.duration_minutes ?? 15),
    owner: text(row.led_by),
    notes: text(row.notes),
    resourceIds: (row.workshop_section_resources ?? []).map(
      (link) => link.resource_id
    ),
    done: row.done === true,
  };
}

function mapComment(row: WorkshopCommentRow): WorkshopComment {
  return {
    id: row.id,
    author: text(row.author_name) || "Trainer",
    body: text(row.body),
    createdAt: row.created_at ?? new Date().toISOString(),
    resolved: row.resolved === true,
  };
}

export function mapWorkshopRow(row: WorkshopRow): Workshop {
  const now = new Date().toISOString();
  const resources = [...(row.workshop_resources ?? [])]
    .sort(byOrder)
    .map(mapResource);
  const knownResourceIds = new Set(resources.map((resource) => resource.id));

  return {
    id: row.id,
    title: text(row.title),
    summary: text(row.summary),
    status: WORKSHOP_STATUSES.includes(row.status as WorkshopStatus)
      ? (row.status as WorkshopStatus)
      : "draft",
    startsAt: row.starts_at ?? now,
    location: text(row.location),
    audience: text(row.audience),
    trainers: (row.trainers ?? []).map((trainer) => text(trainer)).filter(Boolean),
    resources,
    sections: [...(row.workshop_sections ?? [])]
      .sort(byOrder)
      .map(mapSection)
      .map((section) => ({
        ...section,
        resourceIds: section.resourceIds.filter((id) => knownResourceIds.has(id)),
      })),
    comments: [...(row.workshop_comments ?? [])]
      .map(mapComment)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    createdAt: row.created_at ?? now,
    updatedAt: row.updated_at ?? now,
  };
}

export function nextSortOrder(count: number) {
  return (count + 1) * 10;
}

export async function fetchWorkshops(): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from("workshops")
    .select(WORKSHOP_SELECT)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as WorkshopRow[]).map(mapWorkshopRow);
}

export type WorkshopInput = {
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  audience: string;
  trainers: string[];
  status?: WorkshopStatus;
};

export async function createWorkshopRecord(
  input: WorkshopInput,
  userId: string | null
) {
  const { data, error } = await supabase
    .from("workshops")
    .insert({
      title: input.title.trim(),
      summary: nullableText(input.summary),
      status: input.status ?? "draft",
      starts_at: input.startsAt,
      location: nullableText(input.location),
      audience: nullableText(input.audience),
      trainers: input.trainers,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateWorkshopRecord(
  id: string,
  patch: Partial<Workshop>
) {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.summary !== undefined) update.summary = nullableText(patch.summary);
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.startsAt !== undefined) update.starts_at = patch.startsAt;
  if (patch.location !== undefined) update.location = nullableText(patch.location);
  if (patch.audience !== undefined) update.audience = nullableText(patch.audience);
  if (patch.trainers !== undefined) update.trainers = patch.trainers;

  if (!Object.keys(update).length) return;

  const { error } = await supabase.from("workshops").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteWorkshopRecord(id: string) {
  const { error } = await supabase.from("workshops").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateWorkshopRecord(id: string, title: string) {
  const { data, error } = await supabase.rpc("duplicate_workshop", {
    p_workshop_id: id,
    p_title: title,
  });

  if (error) throw error;
  return data as string;
}

export async function createSectionRecord(
  workshopId: string,
  input: Partial<WorkshopSection>,
  sortOrder: number
) {
  const { error } = await supabase.from("workshop_sections").insert({
    workshop_id: workshopId,
    title: input.title?.trim() || "New section",
    kind: input.kind ?? "talk",
    duration_minutes: clampDuration(input.durationMinutes ?? 15),
    led_by: nullableText(input.owner),
    notes: nullableText(input.notes),
    sort_order: sortOrder,
  });

  if (error) throw error;
}

export async function updateSectionRecord(
  sectionId: string,
  patch: Partial<WorkshopSection>
) {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.durationMinutes !== undefined) {
    update.duration_minutes = clampDuration(patch.durationMinutes);
  }
  if (patch.owner !== undefined) update.led_by = nullableText(patch.owner);
  if (patch.notes !== undefined) update.notes = nullableText(patch.notes);
  if (patch.done !== undefined) update.done = patch.done;

  if (!Object.keys(update).length) return;

  const { error } = await supabase
    .from("workshop_sections")
    .update(update)
    .eq("id", sectionId);
  if (error) throw error;
}

export async function deleteSectionRecord(sectionId: string) {
  const { error } = await supabase
    .from("workshop_sections")
    .delete()
    .eq("id", sectionId);
  if (error) throw error;
}

export async function moveSectionRecord(
  sectionId: string,
  direction: "up" | "down"
) {
  const { error } = await supabase.rpc("move_workshop_section", {
    p_section_id: sectionId,
    p_direction: direction,
  });
  if (error) throw error;
}

export async function resetWorkshopProgress(workshopId: string) {
  const { error } = await supabase
    .from("workshop_sections")
    .update({ done: false })
    .eq("workshop_id", workshopId)
    .eq("done", true);
  if (error) throw error;
}

export async function setSectionResource(
  sectionId: string,
  resourceId: string,
  attached: boolean
) {
  if (attached) {
    const { error } = await supabase
      .from("workshop_section_resources")
      .upsert(
        { section_id: sectionId, resource_id: resourceId },
        { onConflict: "section_id,resource_id", ignoreDuplicates: true }
      );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("workshop_section_resources")
    .delete()
    .eq("section_id", sectionId)
    .eq("resource_id", resourceId);
  if (error) throw error;
}

export async function createResourceRecord(
  workshopId: string,
  input: Partial<WorkshopResource>,
  sortOrder: number
) {
  const { error } = await supabase.from("workshop_resources").insert({
    workshop_id: workshopId,
    kind: input.kind ?? "link",
    title: input.title?.trim() || "Untitled link",
    url: input.url?.trim() ?? "",
    note: nullableText(input.note),
    sort_order: sortOrder,
  });

  if (error) throw error;
}

export async function updateResourceRecord(
  resourceId: string,
  patch: Partial<WorkshopResource>
) {
  const update: Record<string, unknown> = {};
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.url !== undefined) update.url = patch.url.trim();
  if (patch.note !== undefined) update.note = nullableText(patch.note);

  if (!Object.keys(update).length) return;

  const { error } = await supabase
    .from("workshop_resources")
    .update(update)
    .eq("id", resourceId);
  if (error) throw error;
}

export async function deleteResourceRecord(resourceId: string) {
  const { error } = await supabase
    .from("workshop_resources")
    .delete()
    .eq("id", resourceId);
  if (error) throw error;
}

export async function createCommentRecord(
  workshopId: string,
  input: Partial<WorkshopComment>,
  userId: string | null
) {
  const { error } = await supabase.from("workshop_comments").insert({
    workshop_id: workshopId,
    author_id: userId,
    author_name: input.author?.trim() || "Trainer",
    body: input.body?.trim() ?? "",
  });

  if (error) throw error;
}

export async function updateCommentRecord(
  commentId: string,
  patch: Partial<WorkshopComment>
) {
  const update: Record<string, unknown> = {};
  if (patch.body !== undefined) update.body = patch.body.trim();
  if (patch.resolved !== undefined) update.resolved = patch.resolved;

  if (!Object.keys(update).length) return;

  const { error } = await supabase
    .from("workshop_comments")
    .update(update)
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteCommentRecord(commentId: string) {
  const { error } = await supabase
    .from("workshop_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}
