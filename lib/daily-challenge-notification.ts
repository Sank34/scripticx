export type NotificationLocale = "en" | "ro";

const genericDailyChallengeBodies = new Set([
  "Solve today's coding challenge.",
  "Rezolvă provocarea de azi.",
]);

export function normalizeLocalizedNotificationValue(
  value: unknown
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && Boolean(entry[1].trim())
    )
  );
}

export function getLocalizedNotificationValue(
  value: unknown,
  locale: NotificationLocale
) {
  const localized = normalizeLocalizedNotificationValue(value);
  return localized[locale] || localized.en || localized.ro || null;
}

export function getDailyChallengeNotificationContent(
  titleI18n: unknown,
  locale: NotificationLocale
) {
  const ro = locale === "ro";
  const problemTitle =
    getLocalizedNotificationValue(titleI18n, locale) ||
    (ro ? "Provocarea de programare" : "Daily coding challenge");

  return {
    body: ro ? `Rezolvă: ${problemTitle}` : `Solve: ${problemTitle}`,
    problemTitle,
    problemTitleI18n: normalizeLocalizedNotificationValue(titleI18n),
    title: ro
      ? "Challenge-ul zilei este disponibil"
      : "Today's challenge is ready",
  };
}

export function getDailyChallengeProblemTitle(input: {
  body?: string | null;
  locale: NotificationLocale;
  metadata?: Record<string, unknown> | null;
}) {
  const metadataTitle = getLocalizedNotificationValue(
    input.metadata?.problemTitleI18n,
    input.locale
  );
  if (metadataTitle) return metadataTitle;

  const body = input.body?.trim();
  if (!body || genericDailyChallengeBodies.has(body)) return null;

  const stripped = body.replace(/^(Solve|Rezolvă|Rezolva):\s*/i, "").trim();
  return stripped || null;
}
