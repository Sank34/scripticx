import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export async function checkAchievements(userId: string, score: number) {
  console.log("CHECKING", userId, score);
  const { data: submissions } = await supabase
    .from("submissions")
    .select("score, problem_id")
    .eq("user_id", userId);

  const best: Record<string, number> = {};

  submissions?.forEach((s: any) => {
    if (!best[s.problem_id] || s.score > best[s.problem_id]) {
      best[s.problem_id] = s.score;
    }
  });

  const solved = Object.values(best).filter((s) => s === 100).length;

  const keys: string[] = [];

  if (solved >= 1) keys.push("first_solve");
  if (solved >= 5) keys.push("five_solves");
  if (solved >= 10) keys.push("ten_solves");
  if (score === 100) keys.push("perfect");

  for (const key of keys) {
    console.log("trying key:", key);
    const { data: achievement } = await supabase
      .from("achievements")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    console.log("achievement found:", achievement);

    if (!achievement) continue;

    const { data: exists } = await supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id)
      .maybeSingle();

    if (exists) continue;

    console.log("inserting achievement:", achievement.id);
    await supabase.from("user_achievements").insert({
      user_id: userId,
      achievement_id: achievement.id,
    });

    toast.success(`Unlocked: ${achievement.title}`);
  }
}