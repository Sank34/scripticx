"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Hash,
  Lock,
  MessageCircle,
  Users,
} from "lucide-react";

import type { StudyGroup } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const initial = group.name.charAt(0).toUpperCase();
  const bannerStyle = group.banner_url
    ? {
        backgroundImage: `url("${group.banner_url}")`,
      }
    : undefined;

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none transition-colors hover:bg-muted/20">
      <CardContent className="flex h-full flex-col gap-4 p-0">
        <div
          className="h-20 w-full border-b bg-muted bg-cover bg-center"
          style={bannerStyle}
        />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="-mt-9 size-16 border-4 border-background shadow-sm">
                <AvatarImage
                  src={group.avatar_url || undefined}
                  alt={group.name}
                />
                <AvatarFallback className="bg-zinc-950 text-lg font-semibold text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">
                  {group.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {group.member_count || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="size-3.5" />
                    {group.channel_count || 0}
                  </span>
                </div>
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
                  className="gap-1 bg-muted text-muted-foreground"
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
            <Badge variant="secondary">{invitedLabel}</Badge>
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
              className="gap-2"
              onClick={() => onJoin?.(group)}
            >
              {acceptInviteLabel}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary" className="font-semibold">
              <Link href={`/groups/${group.slug}`}>
                {openLabel}
              </Link>
            </Button>
          )}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
