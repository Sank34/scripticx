"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, Locale } from "@/lib/i18n";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ro") {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", locale);
  }, [locale]);

  function t(path: string): string {
    const keys = path.split(".");
    let value: any = translations[locale];

    for (const key of keys) {
      value = value?.[key];
    }

    return value || path;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
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