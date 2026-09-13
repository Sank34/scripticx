"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hash, LoaderCircle, Mail } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

type PasswordlessMethod = "magic-link" | "otp";
type PasswordlessAction = "send" | "verify" | null;

type PasswordlessSignInDialogProps = {
  initialEmail: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function PasswordlessSignInDialog({
  initialEmail,
  onOpenChange,
  open,
}: PasswordlessSignInDialogProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [method, setMethod] = useState<PasswordlessMethod>("magic-link");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [action, setAction] = useState<PasswordlessAction>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail((current) => current || initialEmail);
  }, [initialEmail, open]);

  function resetDeliveryState(nextMethod = method) {
    setMethod(nextMethod);
    setCode("");
    setSent(false);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && action) return;
    if (!nextOpen) resetDeliveryState("magic-link");
    onOpenChange(nextOpen);
  }

  async function sendPasswordlessEmail() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || action) return;

    setAction("send");
    setError(null);
    const { error: sendError } = await api.auth.signInWithEmailOtp(
      normalizedEmail,
      `${window.location.origin}/auth/callback?flow=magic-link`
    );
    setAction(null);

    if (sendError) {
      setError(t("login.passwordless.sendError"));
      return;
    }

    setEmail(normalizedEmail);
    setSent(true);
  }

  async function verifyCode() {
    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length < 6 || action) return;

    setAction("verify");
    setError(null);
    const { data, error: verificationError } =
      await api.auth.verifyEmailOtp(email, normalizedCode);
    setAction(null);

    if (verificationError || !data.user) {
      setError(t("login.passwordless.codeError"));
      return;
    }

    onOpenChange(false);
    router.replace(getWorkspaceLandingRoute(data.user.user_metadata));
  }

  const sending = action === "send";
  const verifying = action === "verify";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-5 pr-12">
          <DialogTitle>{t("login.passwordless.title")}</DialogTitle>
          <DialogDescription>
            {t("login.passwordless.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          {!sent ? (
            <>
              <Tabs
                value={method}
                onValueChange={(value) =>
                  resetDeliveryState(value as PasswordlessMethod)
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="magic-link" disabled={Boolean(action)}>
                    <Mail className="size-4" />
                    {t("login.passwordless.magicLink")}
                  </TabsTrigger>
                  <TabsTrigger value="otp" disabled={Boolean(action)}>
                    <Hash className="size-4" />
                    {t("login.passwordless.otp")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <label htmlFor="passwordless-email" className="text-sm font-medium">
                  {t("login.email")}
                </label>
                <Input
                  id="passwordless-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void sendPasswordlessEmail();
                  }}
                  disabled={Boolean(action)}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {method === "magic-link"
                    ? t("login.passwordless.magicLinkDescription")
                    : t("login.passwordless.otpDescription")}
                </p>
              </div>
            </>
          ) : method === "magic-link" ? (
            <div className="py-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted/40">
                <Mail className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {t("login.passwordless.sentTitle")}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {t("login.passwordless.magicLinkSent")}
              </p>
              <p className="mt-2 truncate text-sm font-medium">{email}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">
                  {t("login.passwordless.enterCode")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("login.passwordless.otpSent")}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="passwordless-code" className="text-sm font-medium">
                  {t("login.passwordless.codeLabel")}
                </label>
                <Input
                  id="passwordless-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void verifyCode();
                  }}
                  className="h-12 text-center font-mono text-lg tracking-[0.35em]"
                  disabled={Boolean(action)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {error ? (
            <p role="alert" className="text-sm leading-5 text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
          {sent ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => resetDeliveryState(method)}
                disabled={Boolean(action)}
              >
                <ArrowLeft className="size-4" />
                {t("login.passwordless.back")}
              </Button>
              {method === "otp" ? (
                <Button
                  type="button"
                  onClick={() => void verifyCode()}
                  disabled={verifying || code.replace(/\D/g, "").length < 6}
                >
                  {verifying ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {t("login.passwordless.verifyCode")}
                </Button>
              ) : (
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  {t("login.passwordless.done")}
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void sendPasswordlessEmail()}
              disabled={sending || !email.trim()}
            >
              {sending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {method === "magic-link"
                ? t("login.passwordless.sendMagicLink")
                : t("login.passwordless.sendCode")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
