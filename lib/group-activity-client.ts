import type { StudyGroupActivitySummary } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export async function listStudyGroupActivity(
  userId: string
): Promise<StudyGroupActivitySummary[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("study_group_members")
    .select("group_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) throw membershipError;

  const groupIds = [
    ...new Set(
      (memberships || [])
        .map((row: { group_id?: string | null }) => row.group_id)
        .filter((groupId): groupId is string => Boolean(groupId))
    ),
  ];
  if (!groupIds.length) return [];

  const [
    { data: messageRows, error: messagesError },
    { data: notificationRows, error: notificationsError },
  ] = await Promise.all([
    supabase
      .from("study_group_messages")
      .select("group_id, channel_id, created_at, user_id")
      .in("group_id", groupIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("notifications")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("type", "group_message")
      .is("read_at", null),
  ]);

  if (messagesError) throw messagesError;
  if (
    notificationsError &&
    notificationsError.code !== "42P01" &&
    notificationsError.code !== "PGRST205"
  ) {
    throw notificationsError;
  }

  const latestMessageByGroup = new Map<string, string>();
  const latestMessageByChannel = new Map<string, Map<string, string>>();
  for (const row of (messageRows || []) as Array<{
    channel_id?: string | null;
    created_at?: string | null;
    group_id?: string | null;
  }>) {
    if (!row.group_id || !row.created_at) continue;
    if (!latestMessageByGroup.has(row.group_id)) {
      latestMessageByGroup.set(row.group_id, row.created_at);
    }
    if (!row.channel_id) continue;

    const channels =
      latestMessageByChannel.get(row.group_id) || new Map<string, string>();
    if (!channels.has(row.channel_id)) {
      channels.set(row.channel_id, row.created_at);
    }
    latestMessageByChannel.set(row.group_id, channels);
  }

  const mentionCounts = new Map<string, number>();
  const mentionCountsByChannel = new Map<string, Map<string, number>>();
  for (const notification of (notificationRows || []) as Array<{
    metadata?: Record<string, unknown> | null;
  }>) {
    const groupId =
      typeof notification.metadata?.groupId === "string"
        ? notification.metadata.groupId
        : null;
    const channelId =
      typeof notification.metadata?.channelId === "string"
        ? notification.metadata.channelId
        : null;
    if (!groupId) continue;

    mentionCounts.set(groupId, (mentionCounts.get(groupId) || 0) + 1);
    if (!channelId) continue;

    const channels =
      mentionCountsByChannel.get(groupId) || new Map<string, number>();
    channels.set(channelId, (channels.get(channelId) || 0) + 1);
    mentionCountsByChannel.set(groupId, channels);
  }

  return groupIds.map((groupId) => {
    const channelIds = new Set<string>([
      ...Array.from(latestMessageByChannel.get(groupId)?.keys() || []),
      ...Array.from(mentionCountsByChannel.get(groupId)?.keys() || []),
    ]);

    return {
      groupId,
      latestMessageAt: latestMessageByGroup.get(groupId) || null,
      unreadMentionCount: mentionCounts.get(groupId) || 0,
      channels: Array.from(channelIds).map((channelId) => ({
        channelId,
        latestMessageAt:
          latestMessageByChannel.get(groupId)?.get(channelId) || null,
        unreadMentionCount:
          mentionCountsByChannel.get(groupId)?.get(channelId) || 0,
      })),
    };
  });
}
