import { supabase } from "@/lib/supabase";

export type CommunityProfile = {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  total_score: number | null;
};

export async function fetchCommunityProfiles(): Promise<CommunityProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, bio, total_score")
    .not("username", "is", null)
    .order("total_score", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data || []).filter(
    (profile): profile is CommunityProfile => Boolean(profile.username)
  );
}
