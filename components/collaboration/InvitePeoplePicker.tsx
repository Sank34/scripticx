"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { MentionCandidate } from "@/lib/api";

type InvitePeoplePickerProps = {
  query: string;
  onQueryChange: (value: string) => void;
  candidates: MentionCandidate[];
  loading?: boolean;
  invitingId?: string | null;
  onInvite: (candidate: MentionCandidate) => void | Promise<void>;
  placeholder: string;
  inviteLabel: string;
  invitingLabel: string;
  followingLabel: string;
  userLabel: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function InvitePeoplePicker({
  query,
  onQueryChange,
  candidates,
  loading = false,
  invitingId = null,
  onInvite,
  placeholder,
  inviteLabel,
  invitingLabel,
  followingLabel,
  userLabel,
  emptyTitle,
  emptyDescription,
}: InvitePeoplePickerProps) {
  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <ScrollArea className="h-72 rounded-[var(--sx-radius-card)] border">
        <div className="space-y-1 p-2">
          {loading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : candidates.length ? (
            candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between gap-3 rounded-[var(--sx-radius-control)] px-2 py-2 transition-colors hover:bg-accent/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    avatarUrl={candidate.avatar_url}
                    username={candidate.username}
                    equippedRewards={candidate.equipped_rewards}
                    className="size-8"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{candidate.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.isFollowing ? followingLabel : userLabel}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onInvite(candidate)}
                  disabled={Boolean(invitingId)}
                >
                  {invitingId === candidate.id ? invitingLabel : inviteLabel}
                </Button>
              </div>
            ))
          ) : (
            <EmptyState
              className="py-10"
              icon={<Users className="size-7" />}
              title={emptyTitle}
              description={emptyDescription}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
