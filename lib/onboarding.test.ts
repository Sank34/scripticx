import { describe, expect, it } from "vitest";

import {
  getOnboardingLandingRoute,
  getOnboardingPersona,
  hasCompletedProductTour,
  needsOnboarding,
  normalizeOnboardingUsername,
  onboardingMetadataKeys,
} from "@/lib/onboarding";

describe("onboarding metadata", () => {
  it("only requires onboarding for explicitly marked unfinished accounts", () => {
    expect(needsOnboarding(undefined)).toBe(false);
    expect(
      needsOnboarding({ [onboardingMetadataKeys.required]: true })
    ).toBe(true);
    expect(
      needsOnboarding({
        [onboardingMetadataKeys.required]: true,
        [onboardingMetadataKeys.completedAt]: "2026-08-04T12:00:00.000Z",
      })
    ).toBe(false);
  });

  it("recognizes a completed product tour", () => {
    expect(hasCompletedProductTour(undefined)).toBe(false);
    expect(
      hasCompletedProductTour({
        [onboardingMetadataKeys.tourCompletedAt]: "2026-08-04T12:00:00.000Z",
      })
    ).toBe(true);
  });
});

describe("normalizeOnboardingUsername", () => {
  it("creates a lowercase profile-safe username", () => {
    expect(normalizeOnboardingUsername("  Ștefan Codes!  ")).toBe(
      "stefan-codes"
    );
  });

  it("limits usernames to 24 characters", () => {
    expect(normalizeOnboardingUsername("a".repeat(40))).toHaveLength(24);
  });
});

describe("workspace persona onboarding", () => {
  it("keeps legacy accounts on the learner workspace", () => {
    expect(getOnboardingPersona(undefined)).toBe("learner");
    expect(getOnboardingLandingRoute("learner")).toBe("/dashboard");
  });

  it("routes student and teacher personas to their workspace", () => {
    expect(
      getOnboardingPersona({ [onboardingMetadataKeys.persona]: "student" })
    ).toBe("student");
    expect(getOnboardingLandingRoute("student")).toBe("/workspace/student");
    expect(getOnboardingLandingRoute("teacher")).toBe("/workspace/teacher");
  });
});
