import { onboardingMetadataKeys } from "@/lib/onboarding";

export type ChoiceDistribution = Record<string, number>;

export type OnboardingStats = {
  completedUsers: number;
  experiences: ChoiceDistribution;
  goals: ChoiceDistribution;
  interests: ChoiceDistribution;
  languages: ChoiceDistribution;
  personas: ChoiceDistribution;
  respondents: number;
  totalUsers: number;
};

type UserWithMetadata = {
  user_metadata?: Record<string, unknown> | null;
};

function addValue(distribution: ChoiceDistribution, value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  distribution[value] = (distribution[value] ?? 0) + 1;
  return true;
}

export function buildOnboardingStats(users: UserWithMetadata[]): OnboardingStats {
  const stats: OnboardingStats = {
    completedUsers: 0,
    experiences: {},
    goals: {},
    interests: {},
    languages: {},
    personas: {},
    respondents: 0,
    totalUsers: users.length,
  };

  for (const user of users) {
    const metadata = user.user_metadata ?? {};
    if (metadata[onboardingMetadataKeys.completedAt]) stats.completedUsers += 1;

    let answered = false;
    answered = addValue(stats.languages, metadata[onboardingMetadataKeys.language]) || answered;
    answered = addValue(stats.personas, metadata[onboardingMetadataKeys.persona]) || answered;
    answered = addValue(stats.experiences, metadata[onboardingMetadataKeys.experience]) || answered;
    answered = addValue(stats.goals, metadata[onboardingMetadataKeys.goal]) || answered;

    const interests = metadata[onboardingMetadataKeys.interests];
    if (Array.isArray(interests)) {
      for (const interest of new Set(interests)) {
        answered = addValue(stats.interests, interest) || answered;
      }
    }

    if (answered) stats.respondents += 1;
  }

  return stats;
}
