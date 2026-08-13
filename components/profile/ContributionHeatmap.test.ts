import { describe, expect, it } from "vitest";

import type { SubmissionActivityHeatmap } from "@/lib/submissionActivity";
import {
  buildContributionHeatmapModel,
  resolveContributionLevel,
} from "./ContributionHeatmap";

function activity(
  input: Partial<SubmissionActivityHeatmap> = {}
): SubmissionActivityHeatmap {
  return {
    startDate: "2026-08-05",
    endDate: "2026-08-11",
    timeZone: "UTC",
    totalSubmissions: 0,
    days: [],
    ...input,
  };
}

describe("buildContributionHeatmapModel", () => {
  it("builds Monday-based complete weeks from the normalized date range", () => {
    const model = buildContributionHeatmapModel(
      activity({ startDate: "2026-07-29" })
    );

    expect(model.startDate).toBe("2026-07-29");
    expect(model.endDate).toBe("2026-08-11");
    expect(model.cells).toHaveLength(21);
    expect(model.weeks).toHaveLength(3);
    expect(model.cells.filter(Boolean)).toHaveLength(14);
  });

  it("combines duplicate defensive input without changing the contract total", () => {
    const model = buildContributionHeatmapModel(
      activity({
        days: [
          { acceptedProblems: 1, date: "2026-08-10", submissions: 2 },
          { acceptedProblems: 2, date: "2026-08-10", submissions: 3 },
          { acceptedProblems: 99, date: "2026-02-30", submissions: 99 },
        ],
        totalSubmissions: 5,
      })
    );
    const day = model.cells.find((cell) => cell?.date === "2026-08-10");

    expect(day).toMatchObject({
      acceptedProblems: 3,
      level: 4,
      submissions: 5,
    });
    expect(model.total).toBe(5);
    expect(model.activeDays).toBe(1);
  });

  it("keeps out-of-range daily rows outside the rendered grid", () => {
    const model = buildContributionHeatmapModel(
      activity({
        days: [
          { acceptedProblems: 1, date: "2026-08-11", submissions: 4 },
          { acceptedProblems: 4, date: "2026-07-01", submissions: 7 },
        ],
        totalSubmissions: 4,
      })
    );

    expect(model.cells.some((cell) => cell?.date === "2026-07-01")).toBe(false);
    expect(model.total).toBe(4);
    expect(model.activeDays).toBe(1);
  });

  it("provides all five visual levels relative to the busiest visible day", () => {
    expect(resolveContributionLevel(0, 8)).toBe(0);
    expect(resolveContributionLevel(1, 8)).toBe(1);
    expect(resolveContributionLevel(3, 8)).toBe(2);
    expect(resolveContributionLevel(5, 8)).toBe(3);
    expect(resolveContributionLevel(8, 8)).toBe(4);
  });
});
