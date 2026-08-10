"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { api, type MentionCandidate } from "@/lib/api";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type ActiveMention = {
  end: number;
  query: string;
  start: number;
};

type MentionTextareaProps = {
  emptyLabel: string;
  followedLabel: string;
  loadingLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchLabel: string;
  userId: string;
  value: string;
};

function findActiveMention(value: string, caret: number): ActiveMention | null {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/(?:^|[^\w@])@([a-zA-Z0-9_-]*)$/);

  if (!match) return null;

  const query = match[1];
  const start = caret - query.length - 1;

  return { end: caret, query, start };
}

export function MentionTextarea({
  emptyLabel,
  followedLabel,
  loadingLabel,
  onChange,
  placeholder,
  searchLabel,
  userId,
  value,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const deferredQuery = useDeferredValue(activeMention?.query ?? "");

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ["mention-candidates", userId, deferredQuery],
    queryFn: () =>
      api.profiles.searchMentionCandidates(userId, deferredQuery, 12),
    enabled: Boolean(activeMention && userId),
    staleTime: 30_000,
  });

  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.username),
    [candidates]
  );

  function updateActiveMention(nextValue: string, caret: number) {
    const nextMention = findActiveMention(nextValue, caret);
    setActiveMention(nextMention);
    setSelectedIndex(0);
  }

  function selectCandidate(candidate: MentionCandidate) {
    if (!activeMention || !candidate.username) return;

    const before = value.slice(0, activeMention.start);
    const after = value.slice(activeMention.end);
    const insertion = `@${candidate.username} `;
    const nextValue = `${before}${insertion}${after}`;
    const nextCaret = before.length + insertion.length;

    onChange(nextValue);
    setActiveMention(null);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <Popover
      open={Boolean(activeMention)}
      onOpenChange={(isOpen) => {
        if (!isOpen) setActiveMention(null);
      }}
    >
      <PopoverAnchor asChild>
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            updateActiveMention(
              nextValue,
              event.target.selectionStart ?? nextValue.length
            );
          }}
          onClick={(event) => {
            updateActiveMention(
              value,
              event.currentTarget.selectionStart ?? value.length
            );
          }}
          onKeyUp={(event) => {
            if (
              !["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)
            ) {
              updateActiveMention(
                value,
                event.currentTarget.selectionStart ?? value.length
              );
            }
          }}
          onKeyDown={(event) => {
            if (!activeMention) return;

            if (event.key === "Escape") {
              event.preventDefault();
              setActiveMention(null);
              return;
            }

            if (event.key === "ArrowDown" && visibleCandidates.length > 0) {
              event.preventDefault();
              setSelectedIndex(
                (current) => (current + 1) % visibleCandidates.length
              );
              return;
            }

            if (event.key === "ArrowUp" && visibleCandidates.length > 0) {
              event.preventDefault();
              setSelectedIndex(
                (current) =>
                  (current - 1 + visibleCandidates.length) %
                  visibleCandidates.length
              );
              return;
            }

            if (event.key === "Enter" && visibleCandidates[selectedIndex]) {
              event.preventDefault();
              selectCandidate(visibleCandidates[selectedIndex]);
            }
          }}
          className="min-h-[120px]"
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] max-w-sm gap-0 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === textareaRef.current) event.preventDefault();
        }}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {activeMention?.query ? searchLabel : followedLabel}
        </div>

        <ScrollArea className="h-52">
          <div className="space-y-0.5 p-1">
            {isFetching && visibleCandidates.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loadingLabel}
              </p>
            ) : visibleCandidates.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </p>
            ) : (
              visibleCandidates.map((candidate, index) => (
                <button
                  key={candidate.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCandidate(candidate)}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/70"
                  }`}
                >
                  <UserAvatar
                    avatarUrl={candidate.avatar_url}
                    username={candidate.username}
                    equippedRewards={candidate.equipped_rewards}
                    className="size-8"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      @{candidate.username}
                    </span>
                    {candidate.isFollowing ? (
                      <span className="block text-xs text-muted-foreground">
                        {followedLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
