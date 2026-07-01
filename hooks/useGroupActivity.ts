"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, type StudyGroupActivitySummary } from "@/lib/api";

const GROUP_ACTIVITY_EVENT = "scripticx:group-activity-seen";
const GROUP_SEEN_PREFIX = "scripticx:groups:last-seen";
const CHANNEL_SEEN_PREFIX = "scripticx:groups:last-channel-seen";

function getSeenKey(userId: string, groupId: string) {
  return `${GROUP_SEEN_PREFIX}:${userId}:${groupId}`;
}

function getChannelSeenKey(userId: string, groupId: string, channelId: string) {
  return `${CHANNEL_SEEN_PREFIX}:${userId}:${groupId}:${channelId}`;
}

function readTimestamp(key: string) {
  if (typeof window === "undefined") return 0;

  const value = window.localStorage.getItem(key);
  const timestamp = value ? Number(value) : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function writeTimestamp(key: string, timestamp: number) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, String(timestamp));
  window.dispatchEvent(new CustomEvent(GROUP_ACTIVITY_EVENT));
}

function readSeenAt(userId: string, groupId: string) {
  return readTimestamp(getSeenKey(userId, groupId));
}

function readChannelSeenAt(userId: string, groupId: string, channelId: string) {
  return readTimestamp(getChannelSeenKey(userId, groupId, channelId));
}

export function markStudyGroupSeen(
  userId: string,
  groupId: string,
  timestamp = Date.now()
) {
  writeTimestamp(getSeenKey(userId, groupId), timestamp);
}

export function markStudyGroupChannelSeen(
  userId: string,
  groupId: string,
  channelId: string,
  timestamp = Date.now()
) {
  writeTimestamp(getChannelSeenKey(userId, groupId, channelId), timestamp);
}

export function useGroupActivity(userId?: string | null) {
  const [seenVersion, setSeenVersion] = useState(0);

  const query = useQuery<StudyGroupActivitySummary[]>({
    queryKey: ["groups", "activity", userId],
    queryFn: () => (userId ? api.groups.listActivity(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });

  const summaries = useMemo(() => query.data || [], [query.data]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    let initialized = false;

    for (const summary of summaries) {
      if (!readSeenAt(userId, summary.groupId)) {
        const baseline = summary.latestMessageAt
          ? Date.parse(summary.latestMessageAt)
          : Date.now();

        if (Number.isFinite(baseline)) {
          window.localStorage.setItem(
            getSeenKey(userId, summary.groupId),
            String(baseline)
          );
          initialized = true;
        }
      }

      for (const channel of summary.channels || []) {
        if (readChannelSeenAt(userId, summary.groupId, channel.channelId)) {
          continue;
        }

        const channelBaseline = channel.latestMessageAt
          ? Date.parse(channel.latestMessageAt)
          : Date.now();

        if (Number.isFinite(channelBaseline)) {
          window.localStorage.setItem(
            getChannelSeenKey(userId, summary.groupId, channel.channelId),
            String(channelBaseline)
          );
          initialized = true;
        }
      }
    }

    if (initialized) {
      setSeenVersion((current) => current + 1);
    }
  }, [summaries, userId]);

  useEffect(() => {
    function handleSeenChange() {
      setSeenVersion((current) => current + 1);
    }

    window.addEventListener(GROUP_ACTIVITY_EVENT, handleSeenChange);
    window.addEventListener("storage", handleSeenChange);

    return () => {
      window.removeEventListener(GROUP_ACTIVITY_EVENT, handleSeenChange);
      window.removeEventListener("storage", handleSeenChange);
    };
  }, []);

  return useMemo(() => {
    const mentionCountsByGroup = new Map<string, number>();
    const mentionCountsByChannel = new Map<string, number>();
    const activityGroupIds = new Set<string>();
    const activityChannelIds = new Set<string>();
    let totalMentionCount = 0;

    if (!userId) {
      return {
        isLoading: query.isLoading,
        mentionCountsByGroup,
        mentionCountsByChannel,
        activityGroupIds,
        activityChannelIds,
        totalMentionCount,
        hasActivity: false,
      };
    }

    for (const summary of summaries) {
      if (summary.unreadMentionCount > 0) {
        mentionCountsByGroup.set(summary.groupId, summary.unreadMentionCount);
        totalMentionCount += summary.unreadMentionCount;
      }

      for (const channel of summary.channels || []) {
        if (channel.unreadMentionCount > 0) {
          mentionCountsByChannel.set(
            channel.channelId,
            channel.unreadMentionCount
          );
        }

        if (!channel.latestMessageAt) continue;

        const latestChannelMessageAt = Date.parse(channel.latestMessageAt);
        const channelSeenAt = readChannelSeenAt(
          userId,
          summary.groupId,
          channel.channelId
        );

        if (
          Number.isFinite(latestChannelMessageAt) &&
          latestChannelMessageAt > channelSeenAt
        ) {
          activityChannelIds.add(channel.channelId);
        }
      }

      if (!summary.latestMessageAt) continue;

      const latestMessageAt = Date.parse(summary.latestMessageAt);
      const seenAt = readSeenAt(userId, summary.groupId);

      if (Number.isFinite(latestMessageAt) && latestMessageAt > seenAt) {
        activityGroupIds.add(summary.groupId);
      }
    }

    return {
      isLoading: query.isLoading,
      mentionCountsByGroup,
      mentionCountsByChannel,
      activityGroupIds,
      activityChannelIds,
      totalMentionCount,
      hasActivity: activityGroupIds.size > 0,
    };
  }, [query.isLoading, seenVersion, summaries, userId]);
}
