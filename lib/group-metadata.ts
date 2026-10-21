import { createPageMetadata, metadataExcerpt, siteConfig } from "@/lib/metadata";

export type GroupMetadataIdentity = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: string | null;
  banner_url?: string | null;
};

export type ChannelMetadataIdentity = { id: string; name: string };

function label(value: string, fallback: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || fallback;
}

export function groupChannelHref(slug: string, channelId?: string | null) {
  const path = `/groups/${encodeURIComponent(slug)}`;
  return channelId ? `${path}?channel=${encodeURIComponent(channelId)}` : path;
}

export function groupChannelNavigationUrl(currentUrl: string, channelId: string | null) {
  const url = new URL(currentUrl);
  if (channelId) url.searchParams.set("channel", channelId);
  else url.searchParams.delete("channel");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function groupDocumentTitle(name: string, channelName?: string | null) {
  const group = label(name, "Study group");
  const channel = channelName ? `#${label(channelName, "channel").replace(/^#+/, "")} · ` : "";
  return `${channel}${group} | ${siteConfig.name}`;
}

export function studyGroupMetadata(
  group: GroupMetadataIdentity | null,
  channel: ChannelMetadataIdentity | null = null,
) {
  if (!group || group.visibility !== "public") {
    return createPageMetadata({
      title: "Study Group",
      description: "Sign in to access your study groups and collaborate with other programmers on ScripticX.",
      path: "/groups",
      section: "Study Groups",
      noIndex: true,
    });
  }
  const name = label(group.name, "Study group");
  const channelName = channel ? label(channel.name, "channel").replace(/^#+/, "") : null;
  const fallback = `Join ${name} on ScripticX to discuss programming, ask questions, and collaborate in study channels.`;
  const description = channelName
    ? `Explore #${channelName} in ${name} on ScripticX. Join the group to take part in the conversation and collaborate with its members.`
    : metadataExcerpt(group.description, fallback) || fallback;
  return createPageMetadata({
    title: channelName ? `#${channelName} · ${name}` : `${name} — Study Group`,
    description,
    path: groupChannelHref(group.slug, channel?.id),
    image: group.banner_url,
    section: channel ? "Group Channel" : "Study Groups",
    noIndex: Boolean(channel),
    keywords: [name, "programming study group", "coding community", ...(channelName ? [channelName] : [])],
  });
}

export function isGroupChannelId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}
