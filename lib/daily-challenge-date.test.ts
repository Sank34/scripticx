import { describe, expect, it } from "vitest";
import { getDailyChallengeDate } from "./daily-challenge-date";

describe("daily challenge calendar", () => {
  it("switches at Bucharest midnight in summer and winter", () => {
    expect(getDailyChallengeDate(new Date("2026-10-19T20:59:59Z"))).toBe("2026-10-19");
    expect(getDailyChallengeDate(new Date("2026-10-19T21:00:00Z"))).toBe("2026-10-20");
    expect(getDailyChallengeDate(new Date("2026-12-19T21:59:59Z"))).toBe("2026-12-19");
    expect(getDailyChallengeDate(new Date("2026-12-19T22:00:00Z"))).toBe("2026-12-20");
  });
  it("keeps the same key through the autumn clock change", () => {
    expect(getDailyChallengeDate(new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
    expect(getDailyChallengeDate(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25");
  });
});
