"use client";

import FollowButton from "@/components/FollowButton";
import FollowStats from "@/components/FollowStats";
import { useAuth } from "@/hooks/useAuth";

export default function PublicProfileHeader({
  profileId,
  profileUsername,
}: {
  profileId: string;
  profileUsername: string;
}) {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <div className="flex items-center gap-4">

      <FollowStats userId={profileId} username={profileUsername}/>

      {userId && userId !== profileId && (
        <FollowButton
          targetUserId={profileId}
          currentUserId={userId}
        />
      )}

    </div>
  );
}
