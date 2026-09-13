import { supabase } from "@/lib/supabase";
import type { EquippedRewards } from "@/lib/rewards";

export type CommunityProfile = {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  total_score: number | null;
  equipped_rewards: EquippedRewards | null;
};

export async function fetchCommunityProfiles(): Promise<CommunityProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, bio, total_score, equipped_rewards")
    .not("username", "is", null)
    .order("total_score", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data || []).filter(
    (profile): profile is CommunityProfile => Boolean(profile.username)
  );
}
