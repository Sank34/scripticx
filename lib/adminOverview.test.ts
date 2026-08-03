import { describe, expect, it } from "vitest";

import {
  buildActivityFeed,
  buildAttentionItems,
  type AdminCounts,
  type AdminOverviewRaw,
} from "@/lib/adminOverview";

const NOW = new Date("2026-08-03T12:00:00Z");

function healthyCounts(overrides: Partial<AdminCounts> = {}): AdminCounts {
  return {
    bannedUsers: 0,
    contactNew: 0,
    contactTotal: 12,
    problems: 40,
    updates: 5,
    users: 120,
    ...overrides,
  };
}

function healthyRaw(overrides: Partial<AdminOverviewRaw> = {}): AdminOverviewRaw {
  return {
    bannedUsers: [],
    latestUpdates: [
      {
        content_i18n: { en: "…" },
        date: "2026-07-28",
        slug: "july-release",
        tag: "new",
        title_i18n: { en: "July release", ro: "Lansarea din iulie" },
      },
    ],
    openMessages: [],
    todaysChallenge: {
      challenge_date: "2026-08-03",
      id: "dc-today",
      is_active: true,
      problem_id: "p-1",
    },
    upcomingChallenges: [
      { challenge_date: "2026-08-03", id: "dc-1", is_active: true, problem_id: "p-1" },
      { challenge_date: "2026-08-04", id: "dc-2", is_active: true, problem_id: "p-2" },
      { challenge_date: "2026-08-05", id: "dc-3", is_active: true, problem_id: "p-3" },
    ],
    ...overrides,
  };
}

function ids(counts: AdminCounts | undefined, raw: AdminOverviewRaw | undefined) {
  return buildAttentionItems(counts, raw, NOW).map((item) => item.id);
}

describe("buildAttentionItems", () => {
  it("returns nothing when the platform is healthy", () => {
    expect(ids(healthyCounts(), healthyRaw())).toEqual([]);
  });

  it("returns nothing when both inputs are still loading", () => {
    expect(ids(undefined, undefined)).toEqual([]);
  });

  it("never fabricates alerts from unavailable counts", () => {
    const blocked = healthyCounts({
      bannedUsers: null,
      contactNew: null,
      problems: null,
      updates: null,
      users: null,
    });

    expect(ids(blocked, healthyRaw())).toEqual([]);
  });

  it("distinguishes a real zero from an unavailable problem count", () => {
    expect(ids(healthyCounts({ problems: 0 }), healthyRaw())).toContain("noProblems");
    expect(ids(healthyCounts({ problems: null }), healthyRaw())).not.toContain(
      "noProblems"
    );
  });

  it("flags unresolved messages and banned users with their counts", () => {
    const items = buildAttentionItems(
      healthyCounts({ bannedUsers: 2, contactNew: 4 }),
      healthyRaw(),
      NOW
    );

    expect(items.find((item) => item.id === "unresolvedMessages")).toMatchObject({
      count: 4,
      href: "/admin/contact",
      severity: "warn",
    });
    expect(items.find((item) => item.id === "bannedUsers")).toMatchObject({
      count: 2,
      href: "/admin/users",
      severity: "info",
    });
  });

  it("flags a missing daily challenge for today", () => {
    expect(ids(healthyCounts(), healthyRaw({ todaysChallenge: null }))).toContain(
      "noDailyToday"
    );
  });

  it("counts only active challenges when checking the upcoming schedule", () => {
    const raw = healthyRaw({
      upcomingChallenges: [
        { challenge_date: "2026-08-03", id: "a", is_active: true, problem_id: "p" },
        { challenge_date: "2026-08-04", id: "b", is_active: false, problem_id: "p" },
        { challenge_date: "2026-08-05", id: "c", is_active: true, problem_id: "p" },
      ],
    });

    expect(ids(healthyCounts(), raw)).toContain("noDailyUpcoming");
  });

  it("flags a changelog older than 30 days, and one that is missing entirely", () => {
    const stale = healthyRaw({
      latestUpdates: [
        {
          content_i18n: {},
          date: "2026-06-01",
          slug: "old",
          tag: null,
          title_i18n: { en: "Old" },
        },
      ],
    });

    expect(ids(healthyCounts(), stale)).toContain("staleChangelog");
    expect(ids(healthyCounts(), healthyRaw({ latestUpdates: [] }))).toContain(
      "staleChangelog"
    );
  });

  it("sorts warnings ahead of informational items", () => {
    const items = buildAttentionItems(
      healthyCounts({ bannedUsers: 1, contactNew: 3, problems: 0 }),
      healthyRaw({ todaysChallenge: null, upcomingChallenges: [] }),
      NOW
    );
    const severities = items.map((item) => item.severity);

    expect(severities.indexOf("info")).toBeGreaterThan(-1);
    expect(severities.lastIndexOf("warn")).toBeLessThan(severities.indexOf("info"));
  });
});

describe("buildActivityFeed", () => {
  it("returns an empty list while data is still loading", () => {
    expect(buildActivityFeed(undefined, "ro")).toEqual([]);
  });

  it("interleaves all three sources in descending date order", () => {
    const raw = healthyRaw({
      latestUpdates: [
        {
          content_i18n: {},
          date: "2026-08-02",
          slug: "u",
          tag: "new",
          title_i18n: { en: "Update", ro: "Actualizare" },
        },
      ],
      openMessages: [
        {
          created_at: "2026-08-01T09:00:00Z",
          description: "…",
          email: "a@b.co",
          id: "m1",
          name: "Ana",
          status: "new",
          topic: "bug",
        },
      ],
      upcomingChallenges: [
        { challenge_date: "2026-08-04", id: "d1", is_active: true, problem_id: "p" },
      ],
    });

    expect(buildActivityFeed(raw, "en").map((item) => item.kind)).toEqual([
      "daily",
      "update",
      "message",
    ]);
  });

  it("localizes titles and marks unread messages", () => {
    const raw = healthyRaw({
      latestUpdates: [
        {
          content_i18n: {},
          date: "2026-08-02",
          slug: "u",
          tag: "new",
          title_i18n: { en: "Update", ro: "Actualizare" },
        },
      ],
      openMessages: [
        {
          created_at: "2026-08-01T09:00:00Z",
          description: "…",
          email: "a@b.co",
          id: "m1",
          name: "Ana",
          status: "read",
          topic: "bug",
        },
      ],
      upcomingChallenges: [],
    });
    const items = buildActivityFeed(raw, "ro");

    expect(items[0].primary).toBe("Actualizare");
    expect(items[1].isNew).toBe(false);
  });

  it("caps the feed at 8 items", () => {
    const raw = healthyRaw({
      openMessages: Array.from({ length: 6 }, (_, index) => ({
        created_at: `2026-08-0${index + 1}T09:00:00Z`,
        description: "…",
        email: `u${index}@b.co`,
        id: `m${index}`,
        name: `User ${index}`,
        status: "new" as const,
        topic: "other" as const,
      })),
      upcomingChallenges: Array.from({ length: 6 }, (_, index) => ({
        challenge_date: `2026-08-1${index}`,
        id: `d${index}`,
        is_active: true,
        problem_id: "p",
      })),
    });

    expect(buildActivityFeed(raw, "en")).toHaveLength(8);
  });
});
