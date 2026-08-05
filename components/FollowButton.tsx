"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FollowButton({
  targetUserId,
  currentUserId,
}: {
  targetUserId: string;
  currentUserId: string;
}) {
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const isSelf = targetUserId === currentUserId;
  const queryKey = ["profile", targetUserId, "followed-by", currentUserId] as const;
  const { data: following = false, isPending: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(targetUserId && currentUserId && !isSelf),
    staleTime: 2 * 60 * 1000,
  });

  async function toggleFollow() {
    if (isSelf || processing) return;

    setProcessing(true);

    try {
      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        if (error) throw error;

        const actor = await api.profiles.getSummary(currentUserId);
        await api.notifications.create({
          userId: targetUserId,
          actorId: currentUserId,
          type: "follow",
          title: `${actor?.username || "Someone"} started following you`,
          body: "Open their profile from ScripticX.",
          href: actor?.username ? `/u/${actor.username}` : "/profile",
          metadata: {
            username: actor?.username || null,
          },
        });
      }

      queryClient.setQueryData(queryKey, !following);
      void queryClient.invalidateQueries({ queryKey: ["profile", targetUserId] });
      void queryClient.invalidateQueries({ queryKey: ["profile", currentUserId] });
      window.dispatchEvent(new Event("follow-changed"));
      window.dispatchEvent(new Event("profile-updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update follow status");
    } finally {
      setProcessing(false);
    }
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
