import { getLocalized } from "@/lib/getLocalized";
import type { DailyChallenge } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { UpdateEntry } from "@/lib/updates";

export type CountResult = number | null;

export type AdminCounts = {
  bannedUsers: CountResult;
  contactNew: CountResult;
  contactTotal: CountResult;
  problems: CountResult;
  updates: CountResult;
  users: CountResult;
};

export type ContactMessageLite = {
  created_at: string;
  description: string;
  email: string;
  id: string;
  name: string;
  status: "new" | "read" | "resolved";
  topic: "bug" | "feature" | "account" | "feedback" | "other";
};

export type ProfileLite = {
  avatar_url: string | null;
  banned: boolean | null;
  id: string;
  username: string | null;
};

export type AdminOverviewRaw = {
  bannedUsers: ProfileLite[];
  latestUpdates: UpdateEntry[];
  openMessages: ContactMessageLite[];
  todaysChallenge: DailyChallenge | null;
  upcomingChallenges: DailyChallenge[];
};

const STALE_CHANGELOG_DAYS = 30;
const MIN_SCHEDULED_DAILIES = 3;
const ACTIVITY_LIMIT = 8;

export type AttentionSeverity = "warn" | "info";

export type AttentionItemId =
  | "unresolvedMessages"
  | "noDailyToday"
  | "noProblems"
  | "noDailyUpcoming"
  | "bannedUsers"
  | "staleChangelog";

export type AttentionItem = {
  count?: number;
  href: string;
  id: AttentionItemId;
  severity: AttentionSeverity;
};

export function buildAttentionItems(
  counts: AdminCounts | undefined,
  raw: AdminOverviewRaw | undefined,
  now: Date
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (counts) {
    if (counts.contactNew !== null && counts.contactNew > 0) {
      items.push({
        count: counts.contactNew,
        href: "/admin/contact",
        id: "unresolvedMessages",
        severity: "warn",
      });
    }

    if (counts.problems === 0) {
      items.push({ href: "/admin/problems", id: "noProblems", severity: "warn" });
    }

    if (counts.bannedUsers !== null && counts.bannedUsers > 0) {
      items.push({
        count: counts.bannedUsers,
        href: "/admin/users",
        id: "bannedUsers",
        severity: "info",
      });
    }
  }

  if (raw) {
    if (raw.todaysChallenge === null) {
      items.push({ href: "/admin/problems", id: "noDailyToday", severity: "warn" });
    }

    const scheduled = raw.upcomingChallenges.filter(
      (challenge) => challenge.is_active
    ).length;

    if (scheduled < MIN_SCHEDULED_DAILIES) {
      items.push({
        count: scheduled,
        href: "/admin/problems",
        id: "noDailyUpcoming",
        severity: "info",
      });
    }

    const latest = raw.latestUpdates[0];
    const publishedAt = latest ? new Date(latest.date).getTime() : NaN;
    const staleCutoff = now.getTime() - STALE_CHANGELOG_DAYS * 86_400_000;

    if (!Number.isFinite(publishedAt) || publishedAt < staleCutoff) {
      items.push({ href: "/admin/updates", id: "staleChangelog", severity: "info" });
    }
  }

  return items
    .map((item, index) => ({ index, item }))
    .sort((a, b) => {
      const severity =
        Number(a.item.severity === "info") - Number(b.item.severity === "info");
      return severity !== 0 ? severity : a.index - b.index;
    })
    .map(({ item }) => item);
}

export type ActivityKind = "message" | "update" | "daily";

export type ActivityItem = {
  at: string;
  href: string;
  id: string;
  isNew?: boolean;
  kind: ActivityKind;
  primary: string;
  secondary?: string;
};

export function buildActivityFeed(
  raw: AdminOverviewRaw | undefined,
  locale: Locale
): ActivityItem[] {
  if (!raw) return [];

  const items: ActivityItem[] = [
    ...raw.openMessages.map((message) => ({
      at: message.created_at,
      href: "/admin/contact",
      id: `message-${message.id}`,
      isNew: message.status === "new",
      kind: "message" as const,
      primary: message.name || message.email,
      secondary: message.topic,
    })),

    ...raw.latestUpdates.map((update) => ({
      at: update.date,
      href: `/updates/${update.slug}`,
      id: `update-${update.id ?? update.slug}`,
      kind: "update" as const,
      primary: getLocalized(update.title_i18n, locale) || update.slug,
      secondary: update.tag ?? undefined,
    })),

    ...raw.upcomingChallenges.map((challenge) => ({
      at: challenge.challenge_date,
      href: "/admin/problems",
      id: `daily-${challenge.id}`,
      kind: "daily" as const,
      primary:
        getLocalized(challenge.problems?.title_i18n, locale) ||
        challenge.challenge_date,
      secondary: challenge.problems?.difficulty ?? undefined,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, ACTIVITY_LIMIT);
}
