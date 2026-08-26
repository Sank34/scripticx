import { describe, expect, it } from "vitest";

import { onboardingMetadataKeys } from "@/lib/onboarding";
import { buildOnboardingStats } from "@/lib/onboarding-stats";

describe("buildOnboardingStats", () => {
  it("aggregates onboarding answers without exposing individual users", () => {
    const stats = buildOnboardingStats([
      { user_metadata: {
        [onboardingMetadataKeys.completedAt]: "2026-08-22T10:00:00Z",
        [onboardingMetadataKeys.language]: "ro",
        [onboardingMetadataKeys.persona]: "student",
        [onboardingMetadataKeys.experience]: "beginner",
        [onboardingMetadataKeys.goal]: "learn-programming",
        [onboardingMetadataKeys.interests]: ["algorithms", "algorithms", "debugging"],
      } },
      { user_metadata: {
        [onboardingMetadataKeys.language]: "en",
        [onboardingMetadataKeys.persona]: "learner",
        [onboardingMetadataKeys.interests]: ["algorithms"],
      } },
      {},
    ]);

    expect(stats).toMatchObject({
      completedUsers: 1,
      totalUsers: 3,
      respondents: 2,
      languages: { ro: 1, en: 1 },
      personas: { student: 1, learner: 1 },
      interests: { algorithms: 2, debugging: 1 },
    });
  });
});
