import { describe, expect, it } from "vitest";

import {
  attentionSignature,
  buildAttentionBoard,
  isExternalTaskLink,
  isValidTaskLink,
  normalizeTaskLink,
  type AdminTask,
  type AdminTaskBoard,
} from "@/lib/adminTasks";

import type { AttentionItem } from "@/lib/adminOverview";

function task(overrides: Partial<AdminTask> = {}): AdminTask {
  return {
    completed_at: null,
    created_at: "2026-08-01T10:00:00Z",
    description: "Check the printer in lab 2.",
    done: false,
    id: "t-1",
    link: "/admin/problems",
    severity: "warn",
    title: "Fix lab printer",
    ...overrides,
  };
}

function board(overrides: Partial<AdminTaskBoard> = {}): AdminTaskBoard {
  return { dismissals: [], tasks: [], ...overrides };
}

const MESSAGES: AttentionItem = {
  count: 4,
  href: "/admin/contact",
  id: "unresolvedMessages",
  severity: "warn",
};

const CHANGELOG: AttentionItem = {
  href: "/admin/updates",
  id: "staleChangelog",
  severity: "info",
};

describe("attentionSignature", () => {
  it("changes when the underlying count changes", () => {
    expect(attentionSignature(MESSAGES)).not.toBe(
      attentionSignature({ ...MESSAGES, count: 5 })
    );
  });

  it("is stable for countless items", () => {
    expect(attentionSignature(CHANGELOG)).toBe(attentionSignature({ ...CHANGELOG }));
  });
});

describe("task links", () => {
  it("accepts internal paths, absolute http(s) urls and empty values", () => {
    expect(isValidTaskLink("/admin/users")).toBe(true);
    expect(isValidTaskLink("https://example.com/x")).toBe(true);
    expect(isValidTaskLink("  ")).toBe(true);
    expect(isValidTaskLink(null)).toBe(true);
  });

  it("rejects protocol-relative urls and non-http schemes", () => {
    expect(isValidTaskLink("//evil.com")).toBe(false);
    expect(isValidTaskLink("javascript:alert(1)")).toBe(false);
    expect(isValidTaskLink("admin/users")).toBe(false);
  });

  it("normalizes blank links to null and flags external ones", () => {
    expect(normalizeTaskLink("   ")).toBeNull();
    expect(normalizeTaskLink(" /admin ")).toBe("/admin");
    expect(isExternalTaskLink("https://example.com")).toBe(true);
    expect(isExternalTaskLink("/admin")).toBe(false);
  });
});

describe("buildAttentionBoard", () => {
  it("falls back to the generated alerts while tasks are loading", () => {
    const { archived, open } = buildAttentionBoard([MESSAGES, CHANGELOG], undefined);

    expect(open.map((entry) => entry.key)).toEqual([
      "derived-unresolvedMessages",
      "derived-staleChangelog",
    ]);
    expect(archived).toEqual([]);
  });

  it("sorts warnings first and manual tasks above generated alerts", () => {
    const { open } = buildAttentionBoard(
      [MESSAGES, CHANGELOG],
      board({
        tasks: [
          task({ id: "t-info", severity: "info", title: "Later" }),
          task({ id: "t-warn", severity: "warn", title: "Now" }),
        ],
      })
    );

    expect(open.map((entry) => entry.key)).toEqual([
      "task-t-warn",
      "derived-unresolvedMessages",
      "task-t-info",
      "derived-staleChangelog",
    ]);
  });

  it("orders open tasks of equal severity newest first", () => {
    const { open } = buildAttentionBoard(
      [],
      board({
        tasks: [
          task({ created_at: "2026-08-01T10:00:00Z", id: "older" }),
          task({ created_at: "2026-08-03T10:00:00Z", id: "newer" }),
        ],
      })
    );

    expect(open.map((entry) => entry.task?.id)).toEqual(["newer", "older"]);
  });

  it("moves completed tasks to the archive, newest completion first", () => {
    const { archived, open } = buildAttentionBoard(
      [],
      board({
        tasks: [
          task({ completed_at: "2026-08-02T10:00:00Z", done: true, id: "first" }),
          task({ completed_at: "2026-08-04T10:00:00Z", done: true, id: "last" }),
          task({ id: "open" }),
        ],
      })
    );

    expect(open.map((entry) => entry.task?.id)).toEqual(["open"]);
    expect(archived.map((entry) => entry.task?.id)).toEqual(["last", "first"]);
  });

  it("hides a dismissed alert while its signature still matches", () => {
    const { archived, open } = buildAttentionBoard(
      [MESSAGES, CHANGELOG],
      board({
        dismissals: [
          { item_id: "unresolvedMessages", signature: attentionSignature(MESSAGES) },
        ],
      })
    );

    expect(open.map((entry) => entry.key)).toEqual(["derived-staleChangelog"]);
    expect(archived.map((entry) => entry.key)).toEqual([
      "derived-unresolvedMessages",
    ]);
    expect(archived[0].done).toBe(true);
  });

  it("brings a dismissed alert back once the underlying count changes", () => {
    const { archived, open } = buildAttentionBoard(
      [{ ...MESSAGES, count: 7 }],
      board({
        dismissals: [
          { item_id: "unresolvedMessages", signature: attentionSignature(MESSAGES) },
        ],
      })
    );

    expect(open.map((entry) => entry.key)).toEqual(["derived-unresolvedMessages"]);
    expect(archived).toEqual([]);
  });

  it("carries the count and href each row needs to render", () => {
    const { open } = buildAttentionBoard(
      [MESSAGES],
      board({ tasks: [task({ link: null })] })
    );

    expect(open[0]).toMatchObject({ href: null, source: "task" });
    expect(open[1]).toMatchObject({
      derived: { count: 4, id: "unresolvedMessages" },
      href: "/admin/contact",
      source: "derived",
    });
  });
});
