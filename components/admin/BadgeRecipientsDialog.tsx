"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { AchievementIcon } from "@/components/achievements/AchievementBadgeCard";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { BadgeDefinition } from "@/lib/rewards";
import {
  fetchBadgeRecipients,
  setBadgeAwarded,
  type BadgeRecipient,
} from "@/lib/rewardsData";

export function BadgeRecipientsDialog({
  badge,
  locale,
  onOpenChange,
  open,
}: {
  badge: BadgeDefinition | null;
  locale: "en" | "ro";
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [pendingUsers, setPendingUsers] = useState<Set<string>>(new Set());

  const copy = locale === "ro"
    ? {
        title: "Acordă badge-ul",
        subtitle: "Adaugă sau retrage badge-ul pentru participanți și elevi.",
        search: "Caută elevi...",
        awarded: "Au badge-ul",
        give: "Acordă",
        revoke: "Retrage",
        empty: "Nu am găsit utilizatori.",
        failed: "Badge-ul nu a putut fi actualizat pentru acest utilizator.",
        granted: "Badge acordat.",
        revoked: "Badge retras.",
      }
    : {
        title: "Award badge",
        subtitle: "Grant or revoke this badge for participants and students.",
        search: "Search students...",
        awarded: "Have badge",
        give: "Award",
        revoke: "Revoke",
        empty: "No users found.",
        failed: "The badge could not be updated for this user.",
        granted: "Badge awarded.",
        revoked: "Badge revoked.",
      };

  const recipientsQuery = useQuery({
    queryKey: ["admin", "badge-recipients", badge?.id],
    queryFn: () => fetchBadgeRecipients(badge!.id),
    enabled: open && Boolean(badge?.id),
  });

  const visibleRecipients = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase(locale);
    const recipients = recipientsQuery.data || [];
    if (!normalized) return recipients;
    return recipients.filter((recipient) =>
      recipient.username.toLocaleLowerCase(locale).includes(normalized)
    );
  }, [deferredQuery, locale, recipientsQuery.data]);

  async function toggle(recipient: BadgeRecipient) {
    if (!badge || pendingUsers.has(recipient.id)) return;
    const nextAwarded = !recipient.hasBadge;
    setPendingUsers((current) => new Set(current).add(recipient.id));

    try {
      await setBadgeAwarded(badge.id, recipient.id, nextAwarded);
      queryClient.setQueryData<BadgeRecipient[]>(
        ["admin", "badge-recipients", badge.id],
        (current = []) => current.map((item) =>
          item.id === recipient.id ? { ...item, hasBadge: nextAwarded } : item
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "badges"] });
      toast.success(nextAwarded ? copy.granted : copy.revoked);
    } catch {
      toast.error(copy.failed);
    } finally {
      setPendingUsers((current) => {
        const next = new Set(current);
        next.delete(recipient.id);
        return next;
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setQuery("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="grid h-[min(560px,calc(100dvh-3rem))] grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <AchievementIcon
                iconName={badge?.iconName}
                iconUrl={badge?.iconUrl}
                className="size-5"
              />
            </span>
            <div>
              <DialogTitle>{copy.title}: {badge?.title}</DialogTitle>
              <DialogDescription className="mt-1">{copy.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-9 pl-9"
          />
        </div>

        <div className="flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {recipientsQuery.data?.length || 0}
          </span>
          <span>
            {copy.awarded}: {recipientsQuery.data?.filter((item) => item.hasBadge).length || 0}
          </span>
        </div>

        <div className="min-h-0 space-y-1 overflow-y-auto pr-1">
          {recipientsQuery.isPending ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))
          ) : visibleRecipients.length ? (
            visibleRecipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-accent/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    avatarUrl={recipient.avatarUrl}
                    username={recipient.username}
                    equippedRewards={recipient.equippedRewards}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{recipient.username}</p>
                    {recipient.hasBadge && (
                      <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[10px]">
                        <UserCheck className="size-2.5" />
                        {copy.awarded}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant={recipient.hasBadge ? "ghost" : "outline"}
                  size="sm"
                  disabled={pendingUsers.has(recipient.id)}
                  onClick={() => void toggle(recipient)}
                >
                  {pendingUsers.has(recipient.id)
                    ? "..."
                    : recipient.hasBadge
                      ? copy.revoke
                      : copy.give}
                </Button>
              </div>
            ))
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{copy.empty}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
