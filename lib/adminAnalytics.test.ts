import { describe, expect, it } from "vitest";

import {
  buildActivitySeries,
  buildPopularityData,
  hasActivity,
  summarizeActivity,
  type ActivityDayRow,
  type ProblemStatRow,
} from "@/lib/adminAnalytics";

function problem(overrides: Partial<ProblemStatRow> = {}): ProblemStatRow {
  return {
    attempts: 40,
    code: 12,
    difficulty: "easy",
    learners: 10,
    problem_id: "p-1",
    solvers: 4,
    title_i18n: { en: "Two Sum", ro: "Suma a două" },
    ...overrides,
  };
}

function day(overrides: Partial<ActivityDayRow> = {}): ActivityDayRow {
  return {
    active_users: 3,
    day: "2026-08-01",
    solves: 2,
    submissions: 10,
    ...overrides,
  };
}

describe("buildPopularityData", () => {
  it("returns an empty list when there are no rows", () => {
    expect(buildPopularityData(undefined, "en")).toEqual([]);
    expect(buildPopularityData([], "en")).toEqual([]);
  });

  it("computes solve rate from solvers over learners", () => {
    const [point] = buildPopularityData([problem()], "en");

    expect(point.solveRate).toBeCloseTo(0.4);
  });

  it("does not divide by zero when nobody attempted the problem", () => {
    const [point] = buildPopularityData(
      [problem({ attempts: 0, learners: 0, solvers: 0 })],
      "en"
    );

    expect(point.solveRate).toBe(0);
  });

  it("uses the localized title and falls back to the problem code", () => {
    const [localized] = buildPopularityData([problem()], "ro");
    expect(localized.fullLabel).toBe("Suma a două");

    const [fallback] = buildPopularityData(
      [problem({ code: 77, title_i18n: null })],
      "en"
    );
    expect(fallback.fullLabel).toBe("#77");
  });

  it("truncates long labels but keeps the full title", () => {
    const title = "A extremely long problem title that will not fit";
    const [point] = buildPopularityData(
      [problem({ title_i18n: { en: title } })],
      "en"
    );

    expect(point.fullLabel).toBe(title);
    expect(point.label.length).toBeLessThan(title.length);
    expect(point.label.endsWith("…")).toBe(true);
  });

  it("links each bar to the problem editor", () => {
    const [point] = buildPopularityData([problem({ problem_id: "abc" })], "en");

    expect(point.href).toBe("/admin/problems/abc");
  });
});

describe("buildActivitySeries", () => {
  it("keeps zero-activity days in the series", () => {
    const series = buildActivitySeries(
      [
        day({ active_users: 0, day: "2026-08-01", solves: 0, submissions: 0 }),
        day({ day: "2026-08-02" }),
      ],
      "en"
    );

    expect(series).toHaveLength(2);
    expect(series[0].submissions).toBe(0);
  });

  it("labels each day for the active locale", () => {
    const [en] = buildActivitySeries([day()], "en");
    const [ro] = buildActivitySeries([day()], "ro");

    expect(en.dayLabel).toBeTruthy();
    expect(ro.dayLabel).toBeTruthy();
    expect(en.day).toBe("2026-08-01");
  });
});

describe("hasActivity", () => {
  it("is false when every day is empty", () => {
    const series = buildActivitySeries(
      [day({ submissions: 0 }), day({ day: "2026-08-02", submissions: 0 })],
      "en"
    );

    expect(hasActivity(series)).toBe(false);
  });

  it("is true as soon as one day has submissions", () => {
    const series = buildActivitySeries(
      [day({ submissions: 0 }), day({ day: "2026-08-02", submissions: 5 })],
      "en"
    );

    expect(hasActivity(series)).toBe(true);
  });
});

describe("summarizeActivity", () => {
  it("returns zeroed totals with no trend when there is no data", () => {
    expect(summarizeActivity([])).toEqual({
      activeUsers: 0,
      avgPerDay: 0,
      deltaPct: null,
      peakDay: null,
      previousSubmissions: 0,
      solveRate: 0,
      solves: 0,
      submissions: 0,
    });
  });

  it("totals submissions and solves and takes the peak daily user count", () => {
    const summary = summarizeActivity([
      day({ active_users: 3, day: "2026-08-01", solves: 1, submissions: 10 }),
      day({ active_users: 9, day: "2026-08-02", solves: 2, submissions: 20 }),
    ]);

    expect(summary.submissions).toBe(30);
    expect(summary.solves).toBe(3);
    expect(summary.activeUsers).toBe(9);
    expect(summary.peakDay).toBe("2026-08-02");
    expect(summary.avgPerDay).toBe(15);
    expect(summary.solveRate).toBeCloseTo(0.1);
  });

  it("has no peak day when nobody was active", () => {
    const summary = summarizeActivity([
      day({ active_users: 0, day: "2026-08-01", solves: 0, submissions: 0 }),
      day({ active_users: 0, day: "2026-08-02", solves: 0, submissions: 0 }),
    ]);

    expect(summary.peakDay).toBeNull();
    expect(summary.solveRate).toBe(0);
    expect(summary.avgPerDay).toBe(0);
  });

  it("compares the second half of the window against the first", () => {
    const summary = summarizeActivity([
      day({ day: "2026-08-01", submissions: 10 }),
      day({ day: "2026-08-02", submissions: 10 }),
      day({ day: "2026-08-03", submissions: 15 }),
      day({ day: "2026-08-04", submissions: 15 }),
    ]);

    expect(summary.deltaPct).toBe(50);
    expect(summary.previousSubmissions).toBe(20);
  });

  it("reports no trend when the first half was empty", () => {
    const summary = summarizeActivity([
      day({ day: "2026-08-01", submissions: 0 }),
      day({ day: "2026-08-02", submissions: 8 }),
    ]);

    expect(summary.deltaPct).toBeNull();
  });

  it("reports no trend for a single day", () => {
    expect(summarizeActivity([day()]).deltaPct).toBeNull();
  });
});
