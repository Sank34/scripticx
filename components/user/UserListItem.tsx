import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/UserAvatar";

type UserListItemProps = {
  avatarUrl?: string | null;
  description?: string | null;
  href: string;
  meta?: string;
  rank?: number;
  showArrow?: boolean;
  username?: string | null;
  variant?: "card" | "row";
};

export function UserListItem({
  avatarUrl,
  description,
  href,
  meta,
  rank,
  showArrow = true,
  username,
  variant = "card",
}: UserListItemProps) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {rank !== undefined && (
          <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
        )}

        <UserAvatar avatarUrl={avatarUrl} username={username} />

        <div className="min-w-0">
          <p className="truncate font-medium">{username || "user"}</p>

          {description && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}

          {meta && (
            <p className="text-xs text-muted-foreground">{meta}</p>
          )}
        </div>
      </div>

      {showArrow && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  if (variant === "row") {
    return (
      <Link href={href} className="block rounded-md p-2 transition hover:bg-muted/60">
        {content}
      </Link>
    );
  }

  return (
    <Link href={href} className="block">
      <Card className="cursor-pointer hover:scale-[1.01] transition">
        <CardContent className="p-3">{content}</CardContent>
      </Card>
    </Link>
  );
}
