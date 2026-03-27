"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FollowButton from "@/components/FollowButton";
import FollowStats from "@/components/FollowStats";

export default function PublicProfileHeader({
  profileId,
  profileUsername,
}: {
  profileId: string;
  profileUsername: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUserId(session?.user?.id || null);
    }

    getUser();
  }, []);

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