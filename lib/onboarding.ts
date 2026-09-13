export const onboardingMetadataKeys = {
  completedAt: "scripticx_onboarding_completed_at",
  experience: "scripticx_experience_level",
  goal: "scripticx_learning_goal",
  interests: "scripticx_learning_interests",
  language: "scripticx_default_language",
  languageUpdatedAt: "scripticx_language_updated_at",
  persona: "scripticx_workspace_persona",
  required: "scripticx_onboarding_required",
  tourCompletedAt: "scripticx_product_tour_completed_at",
  legacyWelcomeSeenAt: "scripticx_alpha_welcome_seen_at",
} as const;

export const legacyAlphaCohortKey = "scripticx_v1_alpha_onboarding";

export function shouldShowLegacyAlphaWelcome(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  return user.app_metadata?.[legacyAlphaCohortKey] === true
    && needsOnboarding(user.user_metadata)
    && !user.user_metadata?.[onboardingMetadataKeys.legacyWelcomeSeenAt];
}

export const productTourStorageKey = "scripticx.productTour.pending.v1";

export function getProductTourScopeKey(scope: string) {
  return `scripticx.productTour.completed.v1.${scope}`;
}

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

export type OnboardingPersona = "learner" | "student" | "teacher";

export type OnboardingDraft = {
  avatarFile: File | null;
  avatarPreview: string | null;
  bio: string;
  birthDate: string;
  experience: OnboardingExperienceLevel;
  goal: OnboardingGoal;
  interests: string[];
  language: "en" | "ro";
  persona: OnboardingPersona;
  username: string;
};

export function getOnboardingPersona(
  metadata: Record<string, unknown> | undefined
): OnboardingPersona {
  const persona = metadata?.[onboardingMetadataKeys.persona];
  return persona === "student" || persona === "teacher" ? persona : "learner";
}

export function getOnboardingLandingRoute(persona: OnboardingPersona) {
  if (persona === "student") return "/workspace/student";
  if (persona === "teacher") return "/workspace/teacher";
  return "/dashboard";
}

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

export function isValidUsername(value: string) {
  return /^[a-z0-9][a-z0-9_-]{2,23}$/.test(value);
}

export function isValidUsernameInput(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,23}$/.test(value.trim());
}
