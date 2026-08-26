"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { translations, Locale } from "@/lib/i18n";
import { onboardingMetadataKeys } from "@/lib/onboarding";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const userSelectedRef = useRef(false);

  const selectLocale = useCallback((nextLocale: Locale) => {
    userSelectedRef.current = true;
    setPreferenceLoaded(true);
    setLocale(nextLocale);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ro") {
      setLocale(saved);
      setPreferenceLoaded(true);
      return;
    }

    let active = true;
    void import("@/lib/supabase-session")
      .then(({ getSupabaseSession }) => getSupabaseSession())
      .then(({ data }) => {
        if (!active) return;
        const preferred = data.session?.user.user_metadata?.[
          onboardingMetadataKeys.language
        ];
        if (!userSelectedRef.current && (preferred === "en" || preferred === "ro")) {
          setLocale(preferred);
        }
        setPreferenceLoaded(true);
      })
      .catch(() => {
        if (active) setPreferenceLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    localStorage.setItem("lang", locale);
  }, [locale, preferenceLoaded]);

  const t = useCallback((path: string): string => {
    const keys = path.split(".");
    let value: any = translations[locale];

    for (const key of keys) {
      value = value?.[key];
    }

    return value || path;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale: selectLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
