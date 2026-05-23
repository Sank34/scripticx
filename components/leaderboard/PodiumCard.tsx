import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/UserAvatar";

type PodiumCardProps = {
  className: string;
  icon: LucideIcon;
  iconClassName: string;
  pointsLabel: string;
  rank: 1 | 2 | 3;
  user: {
    avatar_url: string | null;
    username: string;
    total_score: number;
  };
};

export function PodiumCard({
  className,
  icon: Icon,
  iconClassName,
  pointsLabel,
  rank,
  user,
}: PodiumCardProps) {
  const isWinner = rank === 1;

  return (
    <Link href={`/u/${user.username}`}>
      <Card className={className}>
        <CardContent className={`flex flex-col items-center gap-3 ${isWinner ? "py-8" : "py-6"}`}>
          <Icon className={iconClassName} />
          <UserAvatar
            avatarUrl={user.avatar_url}
            className={isWinner ? "w-16 h-16" : "w-14 h-14"}
            username={user.username}
          />
          <p className={isWinner ? "font-bold text-lg" : "font-semibold"}>
            {user.username}
          </p>
          <p className={isWinner ? "text-sm" : "text-sm text-muted-foreground"}>
            {user.total_score || 0} {pointsLabel}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
