import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/workspace-cloud", () => ({
  ensureStudentWorkspace: vi.fn(),
}));

import { getPlannerItemStatus, getPlannerRange } from "./student-planner";

describe("student planner", () => {
  it("loads the visible month and enough upcoming days for the agenda", () => {
    const range = getPlannerRange(
      new Date(2026, 7, 15),
      new Date(2026, 7, 20)
    );

    expect(range.start).toEqual(new Date(2026, 6, 27));
    expect(range.end).toEqual(new Date(2026, 8, 24));
  });

  it("does not fetch every month between an old calendar page and today", () => {
    const range = getPlannerRange(
      new Date(2025, 0, 10),
      new Date(2026, 7, 20)
    );

    expect(range.end).toEqual(new Date(2025, 1, 2, 23, 59, 59, 999));
  });

  it("marks unfinished assignments as overdue after their deadline", () => {
    expect(
      getPlannerItemStatus(
        {
          source: "assignment",
          endsAt: "2026-08-20T10:00:00.000Z",
          status: "upcoming",
        },
        new Date("2026-08-21T10:00:00.000Z")
      )
    ).toBe("overdue");
  });

  it("never marks a completed project as overdue", () => {
    expect(
      getPlannerItemStatus(
        {
          source: "project",
          endsAt: "2026-08-20T10:00:00.000Z",
          status: "completed",
        },
        new Date("2026-08-21T10:00:00.000Z")
      )
    ).toBe("completed");
  });
});
