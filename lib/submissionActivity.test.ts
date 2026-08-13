import { describe, expect, it } from "vitest";

import {
  ACCEPTED_SUBMISSION_SCORE,
  buildSubmissionActivityHeatmap,
  buildSubmissionActivityHeatmapFromDailyRows,
  type SubmissionActivitySourceRow,
} from "@/lib/submissionActivity";

function row(
  input: Partial<SubmissionActivitySourceRow> = {}
): SubmissionActivitySourceRow {
  return {
    created_at: "2026-08-11T10:00:00.000Z",
    problem_id: "problem-1",
    score: ACCEPTED_SUBMISSION_SCORE,
    ...input,
  };
}

describe("submission activity heatmap", () => {
  it("builds a dense trailing 12-calendar-month UTC window", () => {
    const result = buildSubmissionActivityHeatmap([], {
      endDate: "2026-08-11",
    });

    expect(result).toMatchObject({
      startDate: "2025-08-12",
      endDate: "2026-08-11",
      timeZone: "UTC",
      totalSubmissions: 0,
    });
    expect(result.days).toHaveLength(365);
    expect(result.days[0]).toEqual({
      date: "2025-08-12",
      submissions: 0,
      acceptedProblems: 0,
    });
    expect(result.days.at(-1)?.date).toBe("2026-08-11");
  });

  it("counts all supplied attempts and distinct accepted problems per day", () => {
    const result = buildSubmissionActivityHeatmap(
      [
        row(),
        row({ created_at: "2026-08-11T11:00:00.000Z" }),
        row({ problem_id: "problem-2", score: 99 }),
        row({ problem_id: "problem-2", score: "100" }),
        row({ problem_id: null, score: 100 }),
        row({ created_at: "invalid" }),
        row({ created_at: "2025-08-11T23:59:59.000Z" }),
      ],
      { endDate: "2026-08-11" }
    );

    expect(result.totalSubmissions).toBe(5);
    expect(result.days.at(-1)).toEqual({
      date: "2026-08-11",
      submissions: 5,
      acceptedProblems: 2,
    });
  });

  it("counts the same accepted problem again on a different day", () => {
    const result = buildSubmissionActivityHeatmap(
      [
        row({ created_at: "2026-08-10T10:00:00.000Z" }),
        row({ created_at: "2026-08-11T10:00:00.000Z" }),
      ],
      { endDate: "2026-08-11", months: 1 }
    );

    expect(result.days.slice(-2)).toEqual([
      { date: "2026-08-10", submissions: 1, acceptedProblems: 1 },
      { date: "2026-08-11", submissions: 1, acceptedProblems: 1 },
    ]);
  });

  it("assigns timestamps using the requested IANA time zone", () => {
    const result = buildSubmissionActivityHeatmap(
      [row({ created_at: "2026-08-10T21:30:00.000Z" })],
      {
        endDate: "2026-08-11",
        months: 1,
        timeZone: "Europe/Bucharest",
      }
    );

    expect(result.days.at(-1)).toEqual({
      date: "2026-08-11",
      submissions: 1,
      acceptedProblems: 1,
    });
  });

  it("clamps leap-day month subtraction before making the boundary exclusive", () => {
    const result = buildSubmissionActivityHeatmap([], {
      endDate: "2024-02-29",
    });

    expect(result.startDate).toBe("2023-03-01");
    expect(result.days).toHaveLength(366);
  });

  it("uses an injectable clock when endDate is omitted", () => {
    const result = buildSubmissionActivityHeatmap([], {
      months: 1,
      now: "2026-08-10T21:30:00.000Z",
      timeZone: "Europe/Bucharest",
    });

    expect(result.endDate).toBe("2026-08-11");
  });

  it("densifies privacy-safe aggregate rows from an RPC", () => {
    const result = buildSubmissionActivityHeatmapFromDailyRows(
      [
        {
          activity_date: "2026-08-11",
          submission_count: "7",
          accepted_problem_count: 3,
        },
        {
          activity_date: "2026-08-11",
          submission_count: 2,
          accepted_problem_count: 1,
        },
        {
          activity_date: "2025-08-11",
          submission_count: 100,
          accepted_problem_count: 100,
        },
        {
          activity_date: "invalid",
          submission_count: 10,
          accepted_problem_count: 10,
        },
      ],
      { endDate: "2026-08-11" }
    );

    expect(result.totalSubmissions).toBe(9);
    expect(result.days.at(-1)).toEqual({
      date: "2026-08-11",
      submissions: 9,
      acceptedProblems: 4,
    });
  });

  it("rejects invalid window options", () => {
    expect(() =>
      buildSubmissionActivityHeatmap([], {
        endDate: "2026-02-30",
      })
    ).toThrow(RangeError);
    expect(() =>
      buildSubmissionActivityHeatmap([], {
        endDate: "2026-08-11",
        months: 0,
      })
    ).toThrow(RangeError);
    expect(() =>
      buildSubmissionActivityHeatmap([], {
        endDate: "2026-08-11",
        timeZone: "Not/A_Time_Zone",
      })
    ).toThrow(RangeError);
  });
});
