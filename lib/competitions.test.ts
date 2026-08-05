import { describe, expect, it } from "vitest";

import {
  calculateCompetitionMaximum,
  calculateCompetitionPoints,
  formatCompetitionDuration,
  getCompetitionPhase,
  slugifyCompetitionName,
} from "@/lib/competitions";

describe("competition scoring", () => {
  it("scales a percentage to the configured problem maximum", () => {
    expect(calculateCompetitionPoints(75, 100)).toBe(75);
    expect(calculateCompetitionPoints(50, 250)).toBe(125);
    expect(calculateCompetitionPoints(130, 100)).toBe(100);
  });

  it("sums different problem maximums", () => {
    expect(
      calculateCompetitionMaximum([
        { max_points: 100 },
        { max_points: 100 },
        { max_points: 100 },
      ])
    ).toBe(300);
    expect(
      calculateCompetitionMaximum([{ max_points: 50 }, { max_points: 150 }])
    ).toBe(200);
  });
});

describe("competition timing", () => {
  const competition = {
    starts_at: "2026-08-05T10:00:00.000Z",
    ends_at: "2026-08-05T12:00:00.000Z",
    status: "published",
  };

  it("derives upcoming, live, break and finished phases", () => {
    expect(
      getCompetitionPhase(competition, [], new Date("2026-08-05T09:00:00Z"))
    ).toBe("upcoming");
    expect(
      getCompetitionPhase(competition, [], new Date("2026-08-05T10:30:00Z"))
    ).toBe("live");
    expect(
      getCompetitionPhase(
        competition,
        [
          {
            starts_at: "2026-08-05T10:30:00Z",
            ends_at: "2026-08-05T10:45:00Z",
          },
        ],
        new Date("2026-08-05T10:35:00Z")
      )
    ).toBe("break");
    expect(
      getCompetitionPhase(competition, [], new Date("2026-08-05T12:00:00Z"))
    ).toBe("finished");
  });
});

describe("competition presentation helpers", () => {
  it("creates stable URL slugs", () => {
    expect(slugifyCompetitionName("Olimpiada de Vară 2026!"))
      .toBe("olimpiada-de-vara-2026");
  });

  it("formats countdowns", () => {
    expect(formatCompetitionDuration(3_661_000)).toBe("01:01:01");
  });
});
