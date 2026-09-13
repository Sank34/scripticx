import { describe, expect, it } from "vitest";

import { onboardingMetadataKeys, type OnboardingDraft } from "@/lib/onboarding";
import {
  buildRegistrationMetadata,
  registrationProfileMetadataKeys,
} from "@/lib/registration-onboarding";
import { workspaceMetadataKeys } from "@/lib/workspaces";

describe("buildRegistrationMetadata", () => {
  it("persists completed onboarding answers before email confirmation", () => {
    const draft: OnboardingDraft = {
      avatarFile: null,
      avatarPreview: null,
      bio: "  Learning algorithms  ",
      birthDate: "2012-02-29",
      experience: "beginner",
      goal: "practice-algorithms",
      interests: ["algorithms", "debugging"],
      language: "ro",
      persona: "student",
      username: "andrei",
    };

    expect(
      buildRegistrationMetadata({
        completedAt: "2026-08-25T16:00:00.000Z",
        draft,
        username: "andrei",
      })
    ).toMatchObject({
      [onboardingMetadataKeys.completedAt]: "2026-08-25T16:00:00.000Z",
      [onboardingMetadataKeys.language]: "ro",
      [onboardingMetadataKeys.persona]: "student",
      [onboardingMetadataKeys.required]: false,
      [registrationProfileMetadataKeys.bio]: "Learning algorithms",
      [registrationProfileMetadataKeys.birthDate]: "2012-02-29",
      [workspaceMetadataKeys.activeWorkspaceKind]: "student",
      locale: "ro",
      preferred_username: "andrei",
    });
  });
});
