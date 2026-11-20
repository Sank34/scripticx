"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { RepositoryList } from "@/components/repositories/RepositoryList";
import RouteGuard from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function RepositoriesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <RouteGuard requireAuth>
      <div className="sx-page mx-auto max-w-4xl space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">{t("repositories.title")}</h1>
          <Button asChild><Link href="/editor">{t("repositories.openEditor")}</Link></Button>
        </header>
        {user && <RepositoryList ownerId={user.id} own />}
      </div>
    </RouteGuard>
  );
}
