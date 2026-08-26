export const PUBLIC_PROFILE_WIDGET_KEYS = [
  "points",
  "activity",
  "stats",
  "achievements",
  "posts",
  "submissions",
  "socialLinks",
] as const;

export type PublicProfileWidgetKey =
  (typeof PUBLIC_PROFILE_WIDGET_KEYS)[number];

export type PublicProfileVisibility = Record<PublicProfileWidgetKey, boolean>;

export const DEFAULT_PUBLIC_PROFILE_VISIBILITY: PublicProfileVisibility = {
  points: true,
  activity: true,
  stats: true,
  achievements: true,
  posts: true,
  submissions: true,
  socialLinks: true,
};

export function normalizePublicProfileVisibility(
  value: unknown
): PublicProfileVisibility {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return PUBLIC_PROFILE_WIDGET_KEYS.reduce<PublicProfileVisibility>(
    (visibility, key) => {
      visibility[key] = source[key] !== false;
      return visibility;
    },
    { ...DEFAULT_PUBLIC_PROFILE_VISIBILITY }
  );
}
