import { supabase } from "@/lib/supabase";

export const DEFAULT_PROBLEM_HINT_COST = 25;
export const DEFAULT_PROBLEM_SOLUTION_COST = 100;

export type ProblemGuidance = {
  balance: number;
  hasHint: boolean;
  hasSolution: boolean;
  hintCost: number;
  hintI18n: Record<string, string> | null;
  hintUnlocked: boolean;
  solutionCode: string | null;
  solutionCost: number;
  solutionUnlocked: boolean;
};

export type ProblemGuidanceAdmin = {
  hint_cost?: number | null;
  hint_i18n?: Record<string, string> | null;
  problem_id?: string;
  solution_code?: string | null;
  solution_cost?: number | null;
};

export type ProblemUnlockResult = {
  alreadyUnlocked: boolean;
  balance: number;
  contentType: "hint" | "solution";
  cost: number;
  unlocked: boolean;
};

function positiveCost(value: unknown, fallback: number) {
  const cost = Number(value);
  return Number.isFinite(cost) ? Math.max(0, Math.min(1_000_000, Math.trunc(cost))) : fallback;
}

export function normalizeProblemGuidance(value: unknown): ProblemGuidance {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const hintI18n = row.hintI18n && typeof row.hintI18n === "object"
    ? Object.fromEntries(
        Object.entries(row.hintI18n).filter(([, text]) => typeof text === "string")
      )
    : null;
  const solutionCode = typeof row.solutionCode === "string" ? row.solutionCode : null;
  return {
    balance: Math.max(0, Number(row.balance) || 0),
    hasHint: row.hasHint === true,
    hasSolution: row.hasSolution === true,
    hintCost: positiveCost(row.hintCost, DEFAULT_PROBLEM_HINT_COST),
    hintI18n: hintI18n && Object.keys(hintI18n).length ? hintI18n : null,
    hintUnlocked: row.hintUnlocked === true,
    solutionCode,
    solutionCost: positiveCost(row.solutionCost, DEFAULT_PROBLEM_SOLUTION_COST),
    solutionUnlocked: row.solutionUnlocked === true,
  };
}

export async function fetchProblemGuidance(problemId: string) {
  const { data, error } = await supabase.rpc("get_problem_guidance", {
    p_problem_id: problemId,
  });
  if (error) throw error;
  return normalizeProblemGuidance(data);
}

export async function unlockProblemContent(
  problemId: string,
  contentType: "hint" | "solution"
) {
  const { data, error } = await supabase.rpc("unlock_problem_content", {
    p_content_type: contentType,
    p_problem_id: problemId,
  });
  if (error) throw error;
  const row = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return {
    alreadyUnlocked: row.alreadyUnlocked === true,
    balance: Math.max(0, Number(row.balance) || 0),
    contentType: row.contentType === "solution" ? "solution" : "hint",
    cost: positiveCost(row.cost, 0),
    unlocked: row.unlocked === true,
  } satisfies ProblemUnlockResult;
}

export function getProblemGuidanceErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const message = "message" in error ? String(error.message) : "";
  return [
    "authentication_required",
    "content_unavailable",
    "hint_required",
    "insufficient_reward_points",
  ].find((code) => message.includes(code)) || "unknown";
}
