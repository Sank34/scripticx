"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { onAuthStateChange } from "@/lib/auth-client";
import { translations, type Locale } from "@/lib/i18n";
import {
  getLanguageStorageKey,
  normalizeLocale,
  resolveLocalePreference,
  resolveTranslation,
  type TranslationVariables,
} from "@/lib/language";
import { onboardingMetadataKeys } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { getSupabaseSession } from "@/lib/supabase-session";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, variables?: TranslationVariables) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const activeUserIdRef = useRef<string | null>(null);
  const authRevisionRef = useRef(0);
  const selectionRevisionRef = useRef(0);
  const accountRevisionRef = useRef<AccountLanguagePreference | null>(null);
  const pendingLocaleRef = useRef<{
    locale: Locale;
    updatedAt: number;
    userId: string;
  } | null>(
    null
  );
  const preferenceUpdateRef = useRef(Promise.resolve());

  const selectLocale = useCallback((nextLocale: Locale) => {
    selectionRevisionRef.current += 1;
    setLocale(nextLocale);
    writeStoredLocale(activeUserIdRef.current, nextLocale);

    const userId = activeUserIdRef.current;
    if (!userId) return;
    const updatedAt = Date.now();
    pendingLocaleRef.current = { locale: nextLocale, updatedAt, userId };
    const clearPendingIntent = () => {
      if (
        pendingLocaleRef.current?.userId === userId &&
        pendingLocaleRef.current.locale === nextLocale &&
        pendingLocaleRef.current.updatedAt === updatedAt
      ) {
        pendingLocaleRef.current = null;
      }
    };

    preferenceUpdateRef.current = preferenceUpdateRef.current
      .catch(() => undefined)
      .then(async () => {
        if (
          activeUserIdRef.current !== userId ||
          pendingLocaleRef.current?.userId !== userId ||
          pendingLocaleRef.current.locale !== nextLocale ||
          pendingLocaleRef.current.updatedAt !== updatedAt
        ) return;
        const { data } = await getSupabaseSession();
        const session = data.session;
        if (
          !session ||
          session.user.id !== userId ||
          activeUserIdRef.current !== userId
        ) {
          clearPendingIntent();
          return;
        }

        let saved = false;
        let selectionIsLatest = true;
        let authoritativePreference: AccountLanguagePreference | null = null;
        try {
          let expectedRevision = accountRevisionRef.current?.userId === userId
            ? accountRevisionRef.current.revision
            : null;
          if (expectedRevision === null) {
            const preference = await readAccountLanguage(session.access_token);
            if (
              preference.userId !== userId ||
              activeUserIdRef.current !== userId ||
              pendingLocaleRef.current?.userId !== userId ||
              pendingLocaleRef.current.locale !== nextLocale ||
              pendingLocaleRef.current.updatedAt !== updatedAt
            ) return;
            expectedRevision = preference.revision;
            accountRevisionRef.current = newerAccountPreference(
              accountRevisionRef.current,
              preference
            );
          }

          const result = await updateAccountLanguage(
            session.access_token,
            nextLocale,
            expectedRevision
          );
          saved =
            result.userId === userId &&
            result.locale === nextLocale;
          if (result.userId === userId) {
            authoritativePreference = newerAccountPreference(
              accountRevisionRef.current,
              result
            );
            accountRevisionRef.current = authoritativePreference;
            selectionIsLatest = authoritativePreference.revision === result.revision;
          }
        } catch (error) {
          if (
            error instanceof LanguagePreferenceConflict &&
            error.preference.userId === userId &&
            activeUserIdRef.current === userId
          ) {
            const authoritative = newerAccountPreference(
              accountRevisionRef.current,
              error.preference
            );
            accountRevisionRef.current = authoritative;
            if (
              authoritative.locale &&
              pendingLocaleRef.current?.userId === userId &&
              pendingLocaleRef.current.locale === nextLocale &&
              pendingLocaleRef.current.updatedAt === updatedAt
            ) {
              setLocale(authoritative.locale);
              writeStoredLocale(userId, authoritative.locale);
            }
            clearPendingIntent();
            return;
          }

          if (activeUserIdRef.current === userId) accountRevisionRef.current = null;
          clearPendingIntent();
          return;
        }
        if (!saved) {
          clearPendingIntent();
          return;
        }
        if (!selectionIsLatest) {
          if (
            authoritativePreference?.locale &&
            pendingLocaleRef.current?.userId === userId &&
            pendingLocaleRef.current.locale === nextLocale &&
            pendingLocaleRef.current.updatedAt === updatedAt
          ) {
            setLocale(authoritativePreference.locale);
            writeStoredLocale(userId, authoritativePreference.locale);
          }
          clearPendingIntent();
          return;
        }
        if (
          pendingLocaleRef.current?.userId === userId &&
          pendingLocaleRef.current.locale === nextLocale &&
          pendingLocaleRef.current.updatedAt === updatedAt
        ) {
          pendingLocaleRef.current = null;
        }
        if (activeUserIdRef.current === userId) {
          // Admin metadata updates do not notify the browser client. Refreshing
          // keeps its persisted user snapshot aligned with the server response.
          void supabase.auth.refreshSession();
        }
      });
  }, []);

  useEffect(() => {
    let active = true;
    const initialRevision = authRevisionRef.current;

    function synchronizePreference(session: Session | null) {
      if (!active) return;
      const revision = authRevisionRef.current + 1;
      authRevisionRef.current = revision;
      const selectionRevision = selectionRevisionRef.current;
      const user = session?.user ?? null;
      const userId = user?.id || null;
      if (activeUserIdRef.current !== userId) {
        accountRevisionRef.current = null;
        if (pendingLocaleRef.current?.userId !== userId) pendingLocaleRef.current = null;
      }
      activeUserIdRef.current = userId;

      const accountLocale =
        normalizeLocale(
          user?.user_metadata?.[onboardingMetadataKeys.language]
        ) ?? normalizeLocale(user?.user_metadata?.locale);
      const pendingLocale =
        pendingLocaleRef.current?.userId === userId
          ? pendingLocaleRef.current.locale
          : null;
      const storedLocale = readStoredLocale(userId);
      const nextLocale = resolveLocalePreference({
        accountLocale: pendingLocale ?? accountLocale,
        browserLanguages: getBrowserLanguages(),
        storedLocale,
      });

      setLocale(nextLocale);
      writeStoredLocale(userId, nextLocale);

      if (!session || !userId) return;
      void readAccountLanguage(session.access_token)
        .then((preference) => {
          const serverLocale = normalizeLocale(preference.locale);
          if (
            !active ||
            preference.userId !== userId ||
            activeUserIdRef.current !== userId ||
            authRevisionRef.current !== revision ||
            selectionRevisionRef.current !== selectionRevision
          ) return;

          const knownRevision = accountRevisionRef.current?.userId === userId
            ? accountRevisionRef.current.revision
            : -1;
          if (preference.revision < knownRevision) return;
          accountRevisionRef.current = preference;
          if (!serverLocale || pendingLocaleRef.current?.userId === userId) return;

          setLocale(serverLocale);
          writeStoredLocale(userId, serverLocale);
        })
        .catch(() => {
          // The session/local preference remains a valid startup fallback.
        });
    }

    void getSupabaseSession()
      .then(({ data }) => {
        if (!active || authRevisionRef.current !== initialRevision) return;
        synchronizePreference(data.session);
      })
      .catch(() => {
        if (!active || authRevisionRef.current !== initialRevision) return;
        synchronizePreference(null);
      });

    const subscription = onAuthStateChange((session) => {
      synchronizePreference(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  const t = useCallback(
    (path: string, variables?: TranslationVariables) =>
      resolveTranslation(translations, locale, path, variables),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale: selectLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

function getBrowserLanguages() {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
}

function readStoredLocale(userId: string | null) {
  try {
    const scopedLocale = localStorage.getItem(getLanguageStorageKey(userId));
    if (scopedLocale) return scopedLocale;
    if (userId) return localStorage.getItem(getLanguageStorageKey(null));
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
}

function writeStoredLocale(userId: string | null, locale: Locale) {
  try {
    localStorage.setItem(getLanguageStorageKey(userId), locale);
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }
}

async function readAccountLanguage(accessToken: string) {
  return languageRequest(accessToken, { method: "GET" });
}

async function updateAccountLanguage(
  accessToken: string,
  locale: Locale,
  expectedRevision: number
) {
  return languageRequest(accessToken, {
    body: JSON.stringify({ expectedRevision, locale }),
    method: "POST",
  });
}

async function languageRequest(accessToken: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("/api/language", {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    const preference = parseLanguagePreference(payload);
    if (response.status === 409 && preference?.locale) {
      throw new LanguagePreferenceConflict({
        ...preference,
        locale: preference.locale,
      });
    }
    if (!response.ok) throw new Error("Could not synchronize language preference");
    if (!preference) throw new Error("Invalid language preference response");
    return preference;
  } finally {
    clearTimeout(timeout);
  }
}

type AccountLanguagePreference = {
  locale: Locale | null;
  revision: number;
  userId: string;
};

function newerAccountPreference(
  current: AccountLanguagePreference | null,
  candidate: AccountLanguagePreference
) {
  if (
    current?.userId === candidate.userId &&
    current.revision > candidate.revision
  ) return current;
  return candidate;
}

class LanguagePreferenceConflict extends Error {
  constructor(public readonly preference: AccountLanguagePreference & { locale: Locale }) {
    super("Language preference changed on another client");
    this.name = "LanguagePreferenceConflict";
  }
}

function parseLanguagePreference(payload: unknown): AccountLanguagePreference | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const locale = normalizeLocale(value.locale);
  if (
    (value.locale !== null && !locale) ||
    typeof value.userId !== "string" ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  ) return null;
  return { locale, revision: value.revision, userId: value.userId };
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
