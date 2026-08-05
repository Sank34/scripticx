import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

type SubmissionScore = {
  problem_id: string;
  score: number;
};

type AchievementRow = {
  id: string;
  key: string;
  title: string;
};

type UnlockedAchievement = {
  id: string;
  title: string;
};

const SOLVE_MILESTONES = [
  { count: 1, key: "first_solve" },
  { count: 5, key: "five_solves" },
  { count: 10, key: "ten_solves" },
] as const;

export async function checkAchievements(userId: string, score: number) {
  const { data: serverUnlocked, error: unlockError } = await supabase.rpc(
    "unlock_automatic_achievements"
  );

  if (!unlockError) {
    for (const achievement of (serverUnlocked || []) as UnlockedAchievement[]) {
      toast.success(`Unlocked: ${achievement.title}`);
    }
    return;
  }

  const rpcUnavailable =
    unlockError.code === "PGRST202" || unlockError.code === "42883";
  if (!rpcUnavailable) return;

  // Compatibility path for deployments where the rewards migration has not
  // reached the database yet. The migration moves this check server-side.
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("score, problem_id")
    .eq("user_id", userId);

  if (submissionsError) return;

  const bestScores = new Map<string, number>();
  for (const submission of (submissions || []) as SubmissionScore[]) {
    const currentBest = bestScores.get(submission.problem_id) ?? -1;
    if (submission.score > currentBest) {
      bestScores.set(submission.problem_id, submission.score);
    }
  }

  const solvedCount = [...bestScores.values()].filter((value) => value === 100).length;
  const eligibleKeys = new Set<string>();

  for (const milestone of SOLVE_MILESTONES) {
    if (solvedCount >= milestone.count) eligibleKeys.add(milestone.key);
  }
  if (score === 100) eligibleKeys.add("perfect");

  if (eligibleKeys.size === 0) return;

  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("id, key, title")
    .in("key", [...eligibleKeys])
    .eq("active", true);

  if (achievementsError || !achievements?.length) return;

  const definitions = achievements as AchievementRow[];
  const { data: existing, error: existingError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", definitions.map((achievement) => achievement.id));

  if (existingError) return;

  const existingIds = new Set(
    (existing || []).map((row: { achievement_id: string }) => row.achievement_id)
  );
  const unlocked = definitions.filter((achievement) => !existingIds.has(achievement.id));

  if (unlocked.length === 0) return;

  const { error: insertError } = await supabase.from("user_achievements").insert(
    unlocked.map((achievement) => ({
      user_id: userId,
      achievement_id: achievement.id,
    }))
  );

  if (insertError) return;

  for (const achievement of unlocked) {
    toast.success(`Unlocked: ${achievement.title}`);
  }
}
