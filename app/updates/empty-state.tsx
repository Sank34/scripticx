"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

export function UpdatesEmptyState() {
  const { locale, t } = useLanguage();

  return (
    <div className="mx-auto flex min-h-96 max-w-xl flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold text-foreground">
        {t("updates.empty.title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {t("updates.empty.subtitle")}
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href="/dashboard">{locale === "ro" ? "Înapoi la dashboard" : "Back to dashboard"}</Link>
      </Button>
    </div>
  );
}
