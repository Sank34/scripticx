"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function FollowButton({
  targetUserId,
  currentUserId,
}: {
  targetUserId: string;
  currentUserId: string;
}) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const isSelf = targetUserId === currentUserId;

  useEffect(() => {
    if (!targetUserId || !currentUserId || isSelf) {
      setLoading(false);
      return;
    }

    let active = true;

    async function checkFollow() {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (!active) return;

      setFollowing(!!data);
      setLoading(false);
    }

    checkFollow();

    return () => {
      active = false;
    };
  }, [targetUserId, currentUserId, isSelf]);

  async function toggleFollow() {
    if (isSelf || processing) return;

    setProcessing(true);

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      setFollowing(true);
    }

    window.dispatchEvent(new Event("follow-changed"));
    window.dispatchEvent(new Event("profile-updated"));

    setProcessing(false);
  }

  if (isSelf) return null;
  if (loading) return null;

  return (
    <Button
      variant={following ? "secondary" : "default"}
      onClick={toggleFollow}
      disabled={processing}
      className="min-w-[100px]"
    >
      {processing
        ? "..."
        : following
        ? "Following"
        : "Follow"}
    </Button>
  );
}