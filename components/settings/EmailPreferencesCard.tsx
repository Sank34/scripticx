"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  BookOpenCheck,
  Mail,
  Megaphone,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  getEmailPreferences,
  updateEmailPreferences,
  type EmailPreferencePatch,
  type EmailPreferences,
} from "@/lib/mail-client";

type PreferenceKey = keyof EmailPreferences;

const preferenceRows: Array<{
  key: PreferenceKey;
  icon: LucideIcon;
}> = [
  { key: "newsletter", icon: Newspaper },
  { key: "product_updates", icon: Megaphone },
  { key: "assignments", icon: BookOpenCheck },
  { key: "competitions", icon: Trophy },
  { key: "social", icon: AtSign },
];

export function EmailPreferencesCard() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);
  const queryKey = ["mail-preferences", user?.id] as const;

  const preferencesQuery = useQuery({
    queryKey,
    queryFn: getEmailPreferences,
    enabled: Boolean(user?.id),
  });

  async function changePreference(key: PreferenceKey, checked: boolean) {
    const previous = preferencesQuery.data;
    if (!previous || savingKey) return;

    const optimistic = { ...previous, [key]: checked };
    queryClient.setQueryData<EmailPreferences>(queryKey, optimistic);
    setSavingKey(key);

    try {
      const patch: EmailPreferencePatch = { [key]: checked, locale };
      const saved = await updateEmailPreferences(patch);
      queryClient.setQueryData<EmailPreferences>(queryKey, saved);
      toast.success(t("settings.emailPreferences.saved"));
    } catch {
      queryClient.setQueryData<EmailPreferences>(queryKey, previous);
      toast.error(t("settings.emailPreferences.saveError"));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="size-4" />
        </div>
        <CardTitle>{t("settings.emailPreferences.title")}</CardTitle>
        <CardDescription>
          {t("settings.emailPreferences.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t("settings.emailPreferences.required.title")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("settings.emailPreferences.required.description")}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            {t("settings.emailPreferences.required.alwaysOn")}
          </span>
        </div>

        {preferencesQuery.isLoading ? (
          <div className="space-y-2 pt-1">
            {preferenceRows.map(({ key }) => (
              <Skeleton key={key} className="h-[4.25rem] w-full rounded-xl" />
            ))}
          </div>
        ) : preferencesQuery.isError || !preferencesQuery.data ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-7 text-center">
            <p className="text-sm font-medium">
              {t("settings.emailPreferences.loadError")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("settings.emailPreferences.loadErrorHint")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void preferencesQuery.refetch()}
              className="mt-3"
            >
              <RefreshCw className="size-3.5" />
              {t("settings.emailPreferences.retry")}
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {preferenceRows.map(({ key, icon: Icon }) => {
              const id = `email-preference-${key}`;
              const isSaving = savingKey === key;

              return (
                <label
                  key={key}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-muted/35 has-[:disabled]:cursor-not-allowed"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {t(`settings.emailPreferences.items.${key}.title`)}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {t(
                        `settings.emailPreferences.items.${key}.description`
                      )}
                    </span>
                  </span>
                  <Switch
                    id={id}
                    checked={preferencesQuery.data[key]}
                    disabled={savingKey !== null}
                    onCheckedChange={(checked) =>
                      void changePreference(key, checked)
                    }
                    aria-label={t(
                      `settings.emailPreferences.items.${key}.title`
                    )}
                  />
                  <span className="sr-only" aria-live="polite">
                    {isSaving ? t("settings.emailPreferences.saving") : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground">
          {t("settings.emailPreferences.consentHint")}
        </p>
      </CardContent>
    </Card>
  );
}
