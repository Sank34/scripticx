import { describe, expect, it } from "vitest";

import {
  getLanguageStorageKey,
  normalizeLocale,
  resolveLocalePreference,
  resolveTranslation,
} from "@/lib/language";

describe("language preference", () => {
  it("keeps cached preferences isolated by user", () => {
    expect(getLanguageStorageKey("user-a")).not.toBe(
      getLanguageStorageKey("user-b")
    );
    expect(getLanguageStorageKey(null)).toBe("scripticx.language.v1:guest");
  });

  it("prefers the account locale and falls back to the scoped cache", () => {
    expect(
      resolveLocalePreference({
        accountLocale: "ro-RO",
        browserLanguages: ["en-US"],
        storedLocale: "en",
      })
    ).toBe("ro");
    expect(
      resolveLocalePreference({
        browserLanguages: ["en-US"],
        storedLocale: "ro",
      })
    ).toBe("ro");
  });

  it("uses the browser language before the English default", () => {
    expect(resolveLocalePreference({ browserLanguages: ["fr-FR", "ro-RO"] })).toBe(
      "ro"
    );
    expect(resolveLocalePreference({ browserLanguages: ["fr-FR"] })).toBe("en");
  });

  it("normalizes supported regional language tags", () => {
    expect(normalizeLocale("RO_ro")).toBe("ro");
    expect(normalizeLocale("en-GB")).toBe("en");
    expect(normalizeLocale("de-DE")).toBeNull();
  });
});

describe("translations", () => {
  const catalogue = {
    en: {
      greeting: "Hello, {name}!",
      onlyEnglish: "English fallback",
    },
    ro: {
      greeting: "Salut, {name}!",
    },
  };

  it("interpolates variables in the active locale", () => {
    expect(resolveTranslation(catalogue, "ro", "greeting", { name: "Ana" })).toBe(
      "Salut, Ana!"
    );
  });

  it("falls back to English and preserves unknown placeholders", () => {
    expect(resolveTranslation(catalogue, "ro", "onlyEnglish")).toBe(
      "English fallback"
    );
    expect(resolveTranslation(catalogue, "en", "greeting")).toBe(
      "Hello, {name}!"
    );
    expect(resolveTranslation(catalogue, "ro", "missing.path")).toBe(
      "missing.path"
    );
  });
});
