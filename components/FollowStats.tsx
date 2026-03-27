"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FollowStats({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  async function fetchCounts() {
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowers(followersCount || 0);
    setFollowing(followingCount || 0);
  }

  useEffect(() => {
    fetchCounts();

    const handler = () => fetchCounts();
    window.addEventListener("follow-changed", handler);

    return () => {
      window.removeEventListener("follow-changed", handler);
    };
  }, [userId]);

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