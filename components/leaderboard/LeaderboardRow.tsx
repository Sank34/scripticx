import Link from "next/link";

import { UserAvatar } from "@/components/user/UserAvatar";

type LeaderboardRowProps = {
  pointsLabel: string;
  rank: number;
  user: {
    avatar_url: string | null;
    username: string;
    total_score: number;
  };
};

export function LeaderboardRow({ pointsLabel, rank, user }: LeaderboardRowProps) {
  return (
    <Link
      href={`/u/${user.username}`}
      className="flex items-center justify-between px-4 py-3 border-b last:border-none hover:bg-muted/50 transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm w-6 text-muted-foreground">#{rank}</span>
        <UserAvatar
          avatarUrl={user.avatar_url}
          className="w-8 h-8"
          username={user.username}
        />
        <span className="font-medium">{user.username}</span>
      </div>

      <span className="font-semibold">
        {user.total_score || 0} {pointsLabel}
      </span>
    </Link>
  );
}
