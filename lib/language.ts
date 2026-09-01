import type { Locale } from "@/lib/i18n";

export type TranslationVariables = Record<string, number | string>;

type TranslationCatalogue = Record<Locale, unknown>;

type LocalePreferenceInput = {
  accountLocale?: unknown;
  browserLanguages?: readonly string[];
  storedLocale?: unknown;
};

const languageStoragePrefix = "scripticx.language.v1";

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const language = value.trim().toLowerCase().split(/[-_]/)[0];
  return language === "en" || language === "ro" ? language : null;
}

export function getLanguageStorageKey(userId: string | null) {
  return `${languageStoragePrefix}:${userId || "guest"}`;
}

export function resolveLocalePreference({
  accountLocale,
  browserLanguages = [],
  storedLocale,
}: LocalePreferenceInput): Locale {
  return (
    normalizeLocale(accountLocale) ||
    normalizeLocale(storedLocale) ||
    browserLanguages.map(normalizeLocale).find(Boolean) ||
    "en"
  );
}

export function resolveTranslation(
  catalogue: TranslationCatalogue,
  locale: Locale,
  path: string,
  variables?: TranslationVariables
) {
  const localized = readTranslation(catalogue[locale], path);
  const fallback = readTranslation(catalogue.en, path);
  const template = localized || fallback || path;

  if (!variables) return template;

  return template.replace(/\{([^{}]+)\}/g, (token, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : undefined;
    return value === undefined ? token : String(value);
  });
}

function readTranslation(dictionary: unknown, path: string) {
  let value = dictionary;

  for (const key of path.split(".")) {
    if (!value || typeof value !== "object") return null;
    value = (value as Record<string, unknown>)[key];
  }

  return typeof value === "string" && value ? value : null;
}
