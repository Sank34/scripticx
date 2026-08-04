export const onboardingMetadataKeys = {
  completedAt: "scripticx_onboarding_completed_at",
  experience: "scripticx_experience_level",
  goal: "scripticx_learning_goal",
  interests: "scripticx_learning_interests",
  required: "scripticx_onboarding_required",
  tourCompletedAt: "scripticx_product_tour_completed_at",
} as const;

export const productTourStorageKey = "scripticx.productTour.pending.v1";

export type OnboardingExperienceLevel =
  | "first-steps"
  | "beginner"
  | "intermediate"
  | "advanced";

export type OnboardingGoal =
  | "learn-programming"
  | "practice-algorithms"
  | "prepare-interviews"
  | "teach-with-scripticx";

export type OnboardingDraft = {
  avatarFile: File | null;
  avatarPreview: string | null;
  bio: string;
  experience: OnboardingExperienceLevel;
  goal: OnboardingGoal;
  interests: string[];
  username: string;
};

export function needsOnboarding(metadata: Record<string, unknown> | undefined) {
  return (
    metadata?.[onboardingMetadataKeys.required] === true &&
    !metadata?.[onboardingMetadataKeys.completedAt]
  );
}

export function hasCompletedProductTour(
  metadata: Record<string, unknown> | undefined
) {
  return Boolean(metadata?.[onboardingMetadataKeys.tourCompletedAt]);
}

export function normalizeOnboardingUsername(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}
