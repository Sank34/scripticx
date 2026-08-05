"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function FollowStats({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["profile", userId, "follow-counts"] as const,
    [userId]
  );
  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);
      if (followersResult.error) throw followersResult.error;
      if (followingResult.error) throw followingResult.error;
      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
      };
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
  const followers = data?.followers || 0;
  const following = data?.following || 0;

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey });
    };
    window.addEventListener("follow-changed", handler);

    return () => {
      window.removeEventListener("follow-changed", handler);
    };
  }, [queryClient, queryKey]);

  return (
    <div className="flex gap-4 mt-1 text-sm">

      <a
        href={`/u/${username}/followers`}
        className="hover:underline"
      >
        <b>{followers}</b> followers
      </a>

      <a
        href={`/u/${username}/following`}
        className="hover:underline"
      >
        <b>{following}</b> following
      </a>

    </div>
  );
}
