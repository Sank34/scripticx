"use client";

import Link from "next/link";
import { Bell, Hash, Lock, MessageCircle, Users } from "lucide-react";

import type { StudyGroup } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GroupCardProps = {
  group: StudyGroup;
  joinLabel: string;
  memberLabel: string;
  pendingLabel: string;
  invitedLabel: string;
  acceptInviteLabel: string;
  privateLabel: string;
  publicLabel: string;
  openLabel: string;
  mentionCount?: number;
  hasActivity?: boolean;
  mentionLabel: string;
  activityLabel: string;
  onJoin?: (group: StudyGroup) => void;
};

export function GroupCard({
  group,
  joinLabel,
  memberLabel,
  pendingLabel,
  invitedLabel,
  acceptInviteLabel,
  privateLabel,
  publicLabel,
  openLabel,
  mentionCount = 0,
  hasActivity = false,
  mentionLabel,
  activityLabel,
  onJoin,
}: GroupCardProps) {
  const isMember = group.status === "active";
  const isPending = group.status === "pending";
  const isInvited = group.status === "invited";
  const isPrivate = group.visibility === "private";

  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-sm">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900">
              <Hash className="size-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{group.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {group.member_count || 0}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {mentionCount > 0 ? (
              <Badge className="gap-1 bg-red-500 text-white hover:bg-red-500">
                <Bell className="size-3" />
                {mentionCount} {mentionLabel}
              </Badge>
            ) : hasActivity ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-zinc-100 text-zinc-600"
                title={activityLabel}
              >
                <MessageCircle className="size-3" />
              </Badge>
            ) : null}

            <Badge variant={isPrivate ? "outline" : "secondary"}>
              {isPrivate ? privateLabel : publicLabel}
            </Badge>
          </div>
        </div>

        {group.description ? (
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : (
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {isPrivate ? privateLabel : publicLabel}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          {isPending ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" />
              {pendingLabel}
            </Badge>
          ) : isMember ? (
            <Badge className="bg-emerald-600 text-white">{memberLabel}</Badge>
          ) : isInvited ? (
            <Badge className="bg-blue-600 text-white">{invitedLabel}</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onJoin?.(group)}
            >
              {joinLabel}
            </Button>
          )}

          {isInvited ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onJoin?.(group)}
            >
              {acceptInviteLabel}
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/groups/${group.slug}`}>{openLabel}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
