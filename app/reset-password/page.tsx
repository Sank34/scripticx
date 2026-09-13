"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, KeyRound, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await api.auth.getSession();
      if (!active) return;

      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    }

    void checkSession();

    const subscription = api.auth.onAuthStateChange((session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword() {
    setError(null);

    if (password.length < 8) {
      setError(t("resetPassword.passwordTooShort"));
      return;
    }
    if (password !== confirmation) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }

    setSaving(true);
    const { error: updateError} = await api.auth.updatePassword(password);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-muted">
            {success ? (
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <KeyRound className="size-5 text-foreground" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {success
              ? t("resetPassword.successTitle")
              : t("resetPassword.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {checkingSession ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : success ? (
            <>
              <p className="text-center text-sm leading-6 text-muted-foreground">
                {t("resetPassword.successDescription")}
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  {t("resetPassword.continueButton")}
                </Link>
              </Button>
            </>
          ) : !hasSession ? (
            <>
              <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm">{t("resetPassword.invalidLink")}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/forgot-password">
                  {t("resetPassword.requestNewLink")}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm leading-6 text-muted-foreground">
                {t("resetPassword.description")}
              </p>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("resetPassword.newPassword")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("resetPassword.confirmPassword")}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleUpdatePassword();
                }}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleUpdatePassword}
                disabled={saving || !password || !confirmation}
              >
                {saving && <LoaderCircle className="size-4 animate-spin" />}
                {t("resetPassword.updateButton")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
