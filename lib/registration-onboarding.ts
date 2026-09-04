import {
  onboardingMetadataKeys,
  type OnboardingDraft,
} from "@/lib/onboarding";
import {
  getDefaultWorkspaceKind,
  WORKSPACE_SETUP_VERSION,
  workspaceMetadataKeys,
} from "@/lib/workspaces";
import { BIRTH_DATE_METADATA_KEY } from "@/lib/birthday";

export const registrationProfileMetadataKeys = {
  bio: "scripticx_registration_bio",
  birthDate: BIRTH_DATE_METADATA_KEY,
} as const;

type RegistrationOnboardingInput = {
  completedAt?: string;
  draft: OnboardingDraft;
  username: string;
};

export function buildRegistrationMetadata({
  completedAt = new Date().toISOString(),
  draft,
  username,
}: RegistrationOnboardingInput): Record<string, unknown> {
  return {
    [onboardingMetadataKeys.completedAt]: completedAt,
    [onboardingMetadataKeys.experience]: draft.experience,
    [onboardingMetadataKeys.goal]: draft.goal,
    [onboardingMetadataKeys.interests]: [...draft.interests],
    [onboardingMetadataKeys.language]: draft.language,
    [onboardingMetadataKeys.persona]: draft.persona,
    [onboardingMetadataKeys.required]: false,
    [registrationProfileMetadataKeys.bio]: draft.bio.trim(),
    [registrationProfileMetadataKeys.birthDate]: draft.birthDate,
    [workspaceMetadataKeys.activeWorkspaceKind]: getDefaultWorkspaceKind(
      draft.persona
    ),
    [workspaceMetadataKeys.setupVersion]: WORKSPACE_SETUP_VERSION,
    locale: draft.language,
    preferred_username: username,
  };
}
