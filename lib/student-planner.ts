import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { ensureStudentWorkspace } from "@/lib/workspace-cloud";
import { supabase } from "@/lib/supabase";

export const plannerColors = [
  "sky",
  "violet",
  "amber",
  "rose",
  "emerald",
  "slate",
] as const;

export type PlannerColor = (typeof plannerColors)[number];
export type PlannerSource = "assignment" | "event" | "project";
export type PlannerFilter = "all" | PlannerSource;
export type PlannerProjectStatus = "planned" | "in_progress" | "completed";
export type PlannerItemStatus =
  | "completed"
  | "in_progress"
  | "overdue"
  | "planned"
  | "upcoming";

export type StudentPlannerItem = {
  id: string;
  source: PlannerSource;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color: PlannerColor;
  status: PlannerItemStatus;
  editable: boolean;
  href: string | null;
  location: string | null;
  progress: number | null;
  classId: string | null;
  className: string | null;
};

export type StudentPlannerData = {
  workspaceId: string;
  items: StudentPlannerItem[];
};

export type PlannerEventInput = {
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color: PlannerColor;
  location?: string | null;
};

export type PlannerProjectInput = {
  title: string;
  description?: string | null;
  dueAt: string;
  status: PlannerProjectStatus;
  progress: number;
  color: PlannerColor;
};

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: PlannerColor;
  location: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  status: PlannerProjectStatus;
  progress: number;
  color: PlannerColor;
};

type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  deadline: string;
  problem_id?: string | null;
  problem_ids?: unknown;
};

type AssignmentSubmissionRow = {
  assignment_id: string;
  problem_id: string;
};

function nullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseProblemIds(assignment: AssignmentRow) {
  const value = assignment.problem_ids;
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && Boolean(item)
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && Boolean(item)
        );
      }
    } catch {
      if (value.startsWith("{") && value.endsWith("}")) {
        return value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
  }

  return assignment.problem_id ? [assignment.problem_id] : [];
}

export function getPlannerRange(month: Date, now = new Date()) {
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const upcomingEnd = addDays(now, 35);
  const containsToday = now >= monthStart && now <= monthEnd;

  return {
    start: monthStart,
    end: containsToday && upcomingEnd > monthEnd ? upcomingEnd : monthEnd,
  };
}

export function getPlannerItemStatus(
  item: Pick<StudentPlannerItem, "endsAt" | "source" | "status">,
  now = new Date()
): PlannerItemStatus {
  if (item.status === "completed") return "completed";
  if (item.source === "event") return "upcoming";
  return new Date(item.endsAt) < now ? "overdue" : item.status;
}

function normalizeEvent(row: CalendarEventRow): StudentPlannerItem {
  return {
    id: row.id,
    source: "event",
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    color: row.color,
    status: "upcoming",
    editable: true,
    href: null,
    location: row.location,
    progress: null,
    classId: null,
    className: null,
  };
}

function normalizeProject(row: ProjectRow, now: Date): StudentPlannerItem {
  const item: StudentPlannerItem = {
    id: row.id,
    source: "project",
    title: row.title,
    description: row.description,
    startsAt: row.due_at,
    endsAt: row.due_at,
    allDay: false,
    color: row.color,
    status: row.status,
    editable: true,
    href: null,
    location: null,
    progress: normalizeProgress(row.progress),
    classId: null,
    className: null,
  };
  return { ...item, status: getPlannerItemStatus(item, now) };
}

function normalizeAssignment(
  row: AssignmentRow,
  className: string | null,
  submittedProblemIds: Set<string>,
  now: Date
): StudentPlannerItem {
  const problemIds = parseProblemIds(row);
  const completed =
    problemIds.length > 0 &&
    problemIds.every((problemId) => submittedProblemIds.has(problemId));
  const progress = problemIds.length
    ? Math.round(
        (problemIds.filter((problemId) => submittedProblemIds.has(problemId))
          .length /
          problemIds.length) *
          100
      )
    : 0;
  const status: PlannerItemStatus = completed
    ? "completed"
    : new Date(row.deadline) < now
      ? "overdue"
      : "upcoming";

  return {
    id: row.id,
    source: "assignment",
    title: row.title,
    description: row.description,
    startsAt: row.deadline,
    endsAt: row.deadline,
    allDay: false,
    color: "amber",
    status,
    editable: false,
    href: `/classes/${row.class_id}/assignments/${row.id}`,
    location: null,
    progress,
    classId: row.class_id,
    className,
  };
}

export async function loadStudentPlanner(input: {
  userId: string;
  start: Date;
  end: Date;
  now?: Date;
}): Promise<StudentPlannerData> {
  const workspaceId = await ensureStudentWorkspace(input.userId);
  const startIso = input.start.toISOString();
  const endIso = input.end.toISOString();
  const now = input.now || new Date();

  const [eventsResult, projectsResult, membershipsResult] = await Promise.all([
    supabase
      .from("workspace_calendar_events")
      .select(
        "id,title,description,starts_at,ends_at,all_day,color,location"
      )
      .eq("workspace_id", workspaceId)
      .lte("starts_at", endIso)
      .gte("ends_at", startIso)
      .order("starts_at", { ascending: true }),
    supabase
      .from("workspace_projects")
      .select("id,title,description,due_at,status,progress,color")
      .eq("workspace_id", workspaceId)
      .gte("due_at", startIso)
      .lte("due_at", endIso)
      .order("due_at", { ascending: true }),
    supabase
      .from("class_members")
      .select("class_id,role")
      .eq("user_id", input.userId),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const classIds = (membershipsResult.data || [])
    .filter((membership) => membership.role !== "teacher")
    .map((membership) => membership.class_id);

  let assignmentRows: AssignmentRow[] = [];
  let classNames = new Map<string, string>();
  let submissionsByAssignment = new Map<string, Set<string>>();

  if (classIds.length) {
    const [assignmentsResult, classesResult] = await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .in("class_id", classIds)
        .not("deadline", "is", null)
        .gte("deadline", startIso)
        .lte("deadline", endIso)
        .order("deadline", { ascending: true }),
      supabase.from("classes").select("id,name").in("id", classIds),
    ]);

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (classesResult.error) throw classesResult.error;

    assignmentRows = (assignmentsResult.data || []) as AssignmentRow[];
    classNames = new Map(
      (classesResult.data || []).map((classRow) => [classRow.id, classRow.name])
    );

    const assignmentIds = assignmentRows.map((assignment) => assignment.id);
    if (assignmentIds.length) {
      const submissionsResult = await supabase
        .from("assignment_problem_submissions")
        .select("assignment_id,problem_id")
        .eq("user_id", input.userId)
        .in("assignment_id", assignmentIds);
      if (submissionsResult.error) throw submissionsResult.error;

      (submissionsResult.data || []).forEach(
        (submission: AssignmentSubmissionRow) => {
          const current =
            submissionsByAssignment.get(submission.assignment_id) ||
            new Set<string>();
          current.add(submission.problem_id);
          submissionsByAssignment.set(submission.assignment_id, current);
        }
      );
    }
  }

  const items = [
    ...(eventsResult.data || []).map((row) =>
      normalizeEvent(row as CalendarEventRow)
    ),
    ...(projectsResult.data || []).map((row) =>
      normalizeProject(row as ProjectRow, now)
    ),
    ...assignmentRows.map((row) =>
      normalizeAssignment(
        row,
        classNames.get(row.class_id) || null,
        submissionsByAssignment.get(row.id) || new Set<string>(),
        now
      )
    ),
  ].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );

  return { workspaceId, items };
}

export async function createPlannerEvent(
  userId: string,
  input: PlannerEventInput
) {
  const workspaceId = await ensureStudentWorkspace(userId);
  const { error } = await supabase.from("workspace_calendar_events").insert({
    workspace_id: workspaceId,
    created_by: userId,
    title: input.title.trim(),
    description: nullableText(input.description),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    all_day: input.allDay,
    color: input.color,
    location: nullableText(input.location),
  });
  if (error) throw error;
}

export async function updatePlannerEvent(
  userId: string,
  id: string,
  input: PlannerEventInput
) {
  const { error } = await supabase
    .from("workspace_calendar_events")
    .update({
      title: input.title.trim(),
      description: nullableText(input.description),
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      all_day: input.allDay,
      color: input.color,
      location: nullableText(input.location),
    })
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}

export async function deletePlannerEvent(userId: string, id: string) {
  const { error } = await supabase
    .from("workspace_calendar_events")
    .delete()
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}

export async function createPlannerProject(
  userId: string,
  input: PlannerProjectInput
) {
  const workspaceId = await ensureStudentWorkspace(userId);
  const { error } = await supabase.from("workspace_projects").insert({
    workspace_id: workspaceId,
    created_by: userId,
    title: input.title.trim(),
    description: nullableText(input.description),
    due_at: input.dueAt,
    status: input.status,
    progress: normalizeProgress(input.progress),
    color: input.color,
  });
  if (error) throw error;
}

export async function updatePlannerProject(
  userId: string,
  id: string,
  input: PlannerProjectInput
) {
  const progress = input.status === "completed" ? 100 : input.progress;
  const { error } = await supabase
    .from("workspace_projects")
    .update({
      title: input.title.trim(),
      description: nullableText(input.description),
      due_at: input.dueAt,
      status: input.status,
      progress: normalizeProgress(progress),
      color: input.color,
    })
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}

export async function deletePlannerProject(userId: string, id: string) {
  const { error } = await supabase
    .from("workspace_projects")
    .delete()
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}
