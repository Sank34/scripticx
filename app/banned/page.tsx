"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";
import { logoutCurrentAccount } from "@/lib/account-session-manager";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

export default function BannedPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: unknown = translations[locale];

    for (const k of keys) {
      if (!value || typeof value !== "object") return key;
      value = (value as Record<string, unknown>)[k];
    }

    return typeof value === "string" ? value : key;
  };

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!profile?.banned) router.replace("/");
  }, [loading, profile?.banned, router, user]);

  async function logout() {
    if (!user) return;

    try {
      const result = await logoutCurrentAccount(user.id);
      router.replace(
        result
          ? getWorkspaceLandingRoute(result.session.user.user_metadata)
          : "/login"
      );
      router.refresh();
    } catch (error) {
      toast.error(
        locale === "ro"
          ? "Nu am putut activa următorul cont salvat."
          : "Could not activate the next saved account.",
        {
          description: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  if (loading || !user || !profile?.banned) return null;

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center rounded-[var(--sx-radius-panel)] bg-background p-6">

      <Card className="max-w-md w-full border-red-500/30 shadow-xl">
        <CardContent className="flex flex-col items-center text-center space-y-4 p-8">

          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-500/10">
            <Ban className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
            {t("banned.title")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t("banned.description")}
          </p>

          <Button
            onClick={logout}
            className="mt-2 bg-red-500 hover:bg-red-600"
          >
            {t("banned.logout")}
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}
