import { expect, it } from "vitest";
import { normalizeAdminPoints } from "./admin-points";

it("raises total when the available balance exceeds it", () => {
  expect(normalizeAdminPoints(3500, 4000, "available")).toEqual({ totalScore: 4000, rewardPoints: 4000 });
});
it("caps available points when total is reduced", () => {
  expect(normalizeAdminPoints(1000, 3000, "total")).toEqual({ totalScore: 1000, rewardPoints: 1000 });
});
it("preserves earned score when available points decrease", () => {
  expect(normalizeAdminPoints(3500, 500, "available")).toEqual({ totalScore: 3500, rewardPoints: 500 });
});
it("normalizes invalid and out-of-range values", () => {
  expect(normalizeAdminPoints(-5, "NaN", "total")).toEqual({ totalScore: 0, rewardPoints: 0 });
  expect(normalizeAdminPoints(2e9, 12.9, "total")).toEqual({ totalScore: 1e9, rewardPoints: 12 });
});
