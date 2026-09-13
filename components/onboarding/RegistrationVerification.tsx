"use client";

import {
  CheckCircle2,
  LoaderCircle,
  LogOut,
  MailCheck,
  RefreshCw,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

type RegistrationVerificationProps = {
  checking: boolean;
  email: string;
  onCheck: () => void;
  onResend: () => void;
  onSignOut: () => void;
  resending: boolean;
  signingOut: boolean;
};

export function RegistrationVerification({
  checking,
  email,
  onCheck,
  onResend,
  onSignOut,
  resending,
  signingOut,
}: RegistrationVerificationProps) {
  const { t } = useLanguage();

  return (
    <div className="onboarding-screen-enter fixed inset-0 z-[120] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-primary" />
      <div className="pointer-events-none fixed inset-0 bg-muted/20" />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="onboarding-reveal onboarding-reveal-header flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logoSCX.svg"
              alt="ScripticX"
              className="h-9 w-9 dark:invert"
            />
            <span className="text-lg font-semibold">ScripticX</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t("login.registration.step")}
          </span>
        </header>

        <div className="onboarding-reveal onboarding-reveal-progress mx-auto mt-4 flex w-full max-w-xl shrink-0 gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className="h-1 flex-1 rounded-full bg-primary" />
          ))}
        </div>

        <main className="onboarding-reveal onboarding-reveal-content mx-auto flex min-h-0 w-full max-w-xl flex-1 items-center py-8">
          <section className="w-full text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-lg border bg-card shadow-sm">
              <MailCheck className="size-7" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-normal sm:text-4xl">
              {t("login.registration.verifyTitle")}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
              {t("login.registration.verifyDescription")}
            </p>

            <div className="mt-6 rounded-lg border bg-card p-4 text-left shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <CheckCircle2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("login.registration.sentTo")}
                  </p>
                  <p className="truncate text-sm font-semibold">{email}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={onResend}
                disabled={checking || resending || signingOut}
              >
                {resending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("login.registration.resend")}
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={onCheck}
                disabled={checking || resending || signingOut}
              >
                {checking ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <MailCheck className="size-4" />
                )}
                {t("login.registration.checkVerification")}
              </Button>
            </div>

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("login.registration.verifyHint")}
            </p>
          </section>
        </main>

        <footer className="onboarding-reveal onboarding-reveal-footer mx-auto flex w-full max-w-xl shrink-0 justify-center pb-[env(safe-area-inset-bottom)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onSignOut}
            disabled={checking || resending || signingOut}
          >
            {signingOut ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {t("login.registration.signOut")}
          </Button>
        </footer>
      </div>
    </div>
  );
}
