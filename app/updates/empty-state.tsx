"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function UpdatesEmptyState() {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl space-y-3 py-12 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">
        {t("updates.empty.title")}
      </h1>
      <p className="text-sm text-zinc-500">
        {t("updates.empty.subtitle")}
      </p>
    </div>
  );
}
