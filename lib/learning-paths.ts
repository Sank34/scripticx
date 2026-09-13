import { supabase } from "@/lib/supabase";

export type LearningPathEnrollmentStatus =
  | "selected"
  | "active"
  | "paused"
  | "completed";

export type LearningPathEnrollment = {
  completedAt: string | null;
  isPrimary: boolean;
  pathId: string;
  selectedAt: string;
  startedAt: string | null;
  status: LearningPathEnrollmentStatus;
  updatedAt: string;
};

export type LearningPathCompletionResult = {
  clearedCount: number;
  completed: boolean;
  newlyCompleted: boolean;
  pathId: string;
  pathSlug: string;
  requiredCount: number;
};

type EnrollmentRow = {
  completed_at: string | null;
  is_primary: boolean;
  path_id: string;
  selected_at: string;
  started_at: string | null;
  status: LearningPathEnrollmentStatus;
  updated_at: string;
};

export const learningPathEnrollmentEvent =
  "scripticx:learning-path-enrollment";

function isUnavailableSchemaError(error: { code?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST205"
  );
}

function mapEnrollment(row: EnrollmentRow): LearningPathEnrollment {
  return {
    completedAt: row.completed_at,
    isPrimary: row.is_primary,
    pathId: row.path_id,
    selectedAt: row.selected_at,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export async function readLearningPathEnrollments(userId: string) {
  const { data, error } = await supabase
    .from("user_learning_path_enrollments")
    .select(
      "path_id, status, is_primary, selected_at, started_at, completed_at, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .returns<EnrollmentRow[]>();

  if (isUnavailableSchemaError(error)) return [];
  if (error) throw error;
  return (data ?? []).map(mapEnrollment);
}

export async function selectLearningPath(pathId: string) {
  const { data, error } = await supabase.rpc("select_learning_path", {
    p_path_id: pathId,
  });

  if (error) throw error;
  const enrollment = mapEnrollment(data as EnrollmentRow);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(learningPathEnrollmentEvent, { detail: enrollment })
    );
  }

  return enrollment;
}

export async function refreshLearningPathCompletion(input: {
  lessonId?: string | null;
  pathId?: string | null;
}) {
  const { data, error } = await supabase.rpc(
    "refresh_learning_path_completion",
    {
      p_lesson_id: input.lessonId ?? null,
      p_path_id: input.pathId ?? null,
    }
  );

  if (isUnavailableSchemaError(error)) return null;
  if (error) throw error;

  const result = data as LearningPathCompletionResult;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(learningPathEnrollmentEvent, { detail: result })
    );
  }

  return result;
}
