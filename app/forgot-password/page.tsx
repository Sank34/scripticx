"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) return;

    setSending(true);
    setError(null);

    const { error: resetError } = await api.auth.resetPasswordForEmail(
      email.trim(),
      `${window.location.origin}/reset-password`
    );

    setSending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-zinc-100">
            {sent ? (
              <CheckCircle2 className="size-5 text-emerald-600" />
            ) : (
              <Mail className="size-5 text-zinc-700" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {sent
              ? t("forgotPassword.sentTitle")
              : t("forgotPassword.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {sent ? (
            <>
              <p className="text-center text-sm leading-6 text-zinc-600">
                {t("forgotPassword.sentDescription")}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="size-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm leading-6 text-zinc-600">
                {t("forgotPassword.description")}
              </p>
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("login.email")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={sending || !email.trim()}
              >
                {sending && <LoaderCircle className="size-4 animate-spin" />}
                {t("forgotPassword.sendButton")}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="size-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
