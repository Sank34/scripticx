"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { onboardingMetadataKeys } from "@/lib/onboarding";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const isFinalizing = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;

    async function finalizeSession() {
      if (isFinalizing.current) return;

      const params = new URLSearchParams(window.location.search);
      const providerError =
        params.get("error_description") || params.get("error");

      if (providerError) {
        setError(providerError);
        return;
      }

      const { data, error: sessionError } = await api.auth.getSession();

      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const user = data.session?.user;
      if (!user) return;

      isFinalizing.current = true;

      try {
        const existingProfile = await api.profiles.getProfile(user.id);
        await api.profiles.ensureForUser(user);
        if (!existingProfile) {
          const { error: metadataError } = await api.auth.updateUserMetadata({
            [onboardingMetadataKeys.required]: true,
          });
          if (metadataError) throw metadataError;
        }
        if (active) router.replace("/dashboard");
      } catch (profileError) {
        isFinalizing.current = false;
        if (active) {
          setError(
            profileError instanceof Error
              ? profileError.message
              : t("authCallback.profileError")
          );
        }
      }
    }

    void finalizeSession();

    const subscription = api.auth.onAuthStateChange((session) => {
      if (session) void finalizeSession();
    });

    timeoutId = window.setTimeout(() => {
      if (active && !isFinalizing.current) {
        setError(t("authCallback.timeout"));
      }
    }, 12000);

    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router, t]);

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {error ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                <CircleAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  {t("authCallback.errorTitle")}
                </h1>
                <p className="text-sm text-zinc-600">{error}</p>
              </div>
              <Button asChild>
                <Link href="/login">{t("authCallback.backToLogin")}</Link>
              </Button>
            </>
          ) : (
            <>
              <LoaderCircle className="size-7 animate-spin text-zinc-700" />
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  {t("authCallback.title")}
                </h1>
                <p className="text-sm text-zinc-600">
                  {t("authCallback.description")}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
