"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  MailWarning,
  RefreshCw,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { cn } from "@/lib/utils";

function getResendLabel(
  t: (key: string) => string,
  sending: boolean,
  cooldownSeconds: number
) {
  if (sending) return t("emailVerification.sending");
  if (cooldownSeconds > 0) {
    return t("emailVerification.retryIn").replace(
      "{seconds}",
      String(cooldownSeconds)
    );
  }
  return t("emailVerification.resend");
}

export function EmailVerificationBanner() {
  const { t } = useLanguage();
  const verification = useEmailVerification();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = verification.email
    ? `scripticx:verification-banner-dismissed:${verification.email}`
    : null;

  useEffect(() => {
    if (!dismissKey) {
      setReady(true);
      return;
    }

    try {
      setDismissed(window.sessionStorage.getItem(dismissKey) === "true");
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, [dismissKey]);

  function dismiss() {
    setDismissed(true);
    if (!dismissKey) return;
    try {
      window.sessionStorage.setItem(dismissKey, "true");
    } catch {
      // Dismissal only needs to last for the current render when storage is blocked.
    }
  }

  if (!ready || !verification.needsVerification || dismissed) return null;

  return (
    <aside
      aria-label={t("emailVerification.bannerLabel")}
      className="relative flex min-h-11 shrink-0 items-center gap-3 border-b border-amber-200/70 bg-amber-50/90 px-3 py-2 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-100 sm:px-5"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <MailWarning className="size-4" />
      </span>

      <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
        <p className="truncate text-xs font-semibold sm:text-sm">
          {verification.sent
            ? t("emailVerification.sentTitle")
            : t("emailVerification.title")}
        </p>
        <p className="hidden truncate text-xs text-amber-800/80 dark:text-amber-200/70 md:block">
          {verification.sent
            ? t("emailVerification.sentBody")
            : t("emailVerification.bannerBody").replace(
                "{email}",
                verification.email
              )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            verification.sending || verification.cooldownSeconds > 0
          }
          onClick={() => void verification.resend()}
          className="border-amber-300 bg-background/70 text-amber-950 hover:bg-background dark:border-amber-800 dark:text-amber-100"
        >
          {verification.sending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <MailCheck className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {getResendLabel(
              t,
              verification.sending,
              verification.cooldownSeconds
            )}
          </span>
        </Button>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={verification.refreshing}
          onClick={() => void verification.refresh()}
          aria-label={t("emailVerification.refresh")}
          title={t("emailVerification.refresh")}
          className="text-amber-800 hover:bg-amber-500/10 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              verification.refreshing && "animate-spin"
            )}
          />
        </Button>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={dismiss}
          aria-label={t("emailVerification.dismiss")}
          className="text-amber-800 hover:bg-amber-500/10 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </aside>
  );
}

export function EmailVerificationProfileStatus() {
  const { t } = useLanguage();
  const verification = useEmailVerification();

  if (!verification.email) return null;

  if (verification.verified) {
    return (
      <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <BadgeCheck className="size-3.5" />
        {t("emailVerification.verified")}
      </span>
    );
  }

  return (
    <div className="mt-2 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
      <MailWarning className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
      <span className="font-medium">{t("emailVerification.unverified")}</span>
      <button
        type="button"
        disabled={verification.sending || verification.cooldownSeconds > 0}
        onClick={() => void verification.resend()}
        className="font-semibold underline decoration-amber-500/40 underline-offset-2 transition hover:decoration-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {getResendLabel(
          t,
          verification.sending,
          verification.cooldownSeconds
        )}
      </button>
    </div>
  );
}

export function EmailVerificationNotification() {
  const { t } = useLanguage();
  const verification = useEmailVerification();

  if (!verification.needsVerification) return null;

  return (
    <div className="relative border-b border-amber-200/70 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
          {verification.sent ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <MailWarning className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
              {verification.sent
                ? t("emailVerification.sentTitle")
                : t("emailVerification.title")}
            </p>
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-500" />
          </div>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {verification.sent
              ? t("emailVerification.sentBody")
              : t("emailVerification.notificationBody")}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                verification.sending || verification.cooldownSeconds > 0
              }
              onClick={() => void verification.resend()}
              className="h-7"
            >
              {verification.sending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <MailCheck className="size-3.5" />
              )}
              {getResendLabel(
                t,
                verification.sending,
                verification.cooldownSeconds
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={verification.refreshing}
              onClick={() => void verification.refresh()}
              className="h-7"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  verification.refreshing && "animate-spin"
                )}
              />
              {t("emailVerification.refresh")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
