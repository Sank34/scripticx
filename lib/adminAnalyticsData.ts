import { supabase } from "@/lib/supabase";

import type {
  ActivityDayRow,
  AdminAnalytics,
  ProblemStatRow,
} from "@/lib/adminAnalytics";

const PROBLEM_STATS_FN = "admin_problem_stats";
const ACTIVITY_DAILY_FN = "admin_activity_daily";
const POPULARITY_LIMIT = 10;

type PostgrestErrorLike = { code?: string } | null;

function isMissingFunction(error: PostgrestErrorLike): boolean {
  return error?.code === "42883" || error?.code === "PGRST202";
}

async function fetchProblemStats(days: number): Promise<ProblemStatRow[] | null> {
  const { data, error } = await supabase.rpc(PROBLEM_STATS_FN, {
    limit_count: POPULARITY_LIMIT,
    window_days: days,
  });

  if (isMissingFunction(error)) return null;
  if (error) throw error;

  return (data ?? []) as ProblemStatRow[];
}

async function fetchActivityDaily(days: number): Promise<ActivityDayRow[] | null> {
  const { data, error } = await supabase.rpc(ACTIVITY_DAILY_FN, {
    window_days: days,
  });

  if (isMissingFunction(error)) return null;
  if (error) throw error;

  return (data ?? []) as ActivityDayRow[];
}

export async function fetchAdminAnalytics(days: number): Promise<AdminAnalytics> {
  const [problems, activity] = await Promise.all([
    fetchProblemStats(days),
    fetchActivityDaily(days),
  ]);

  if (problems === null || activity === null) {
    return { activity: [], available: false, problems: [] };
  }

  return { activity, available: true, problems };
}
