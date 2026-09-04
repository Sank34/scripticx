"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import {
  getRegistrationBirthDate,
} from "@/lib/birthday";
import { savePrivateBirthDate } from "@/lib/birthdayData";
import { isEmailVerificationCallback } from "@/lib/auth-callback";
import { publishEmailVerificationCompleted } from "@/lib/email-verification";
import {
  getOnboardingPersona,
  onboardingMetadataKeys,
  productTourStorageKey,
} from "@/lib/onboarding";
import { registrationProfileMetadataKeys } from "@/lib/registration-onboarding";
import { supabase } from "@/lib/supabase";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const isFinalizing = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;

    async function finalizeSession() {
      if (isFinalizing.current) return;

      const params = new URLSearchParams(window.location.search);
      const verificationFlow = isEmailVerificationCallback(
        window.location.search,
        window.location.hash
      );
      const requestedRoute = params.get("next");
      const nextRoute =
        requestedRoute?.startsWith("/") && !requestedRoute.startsWith("//")
          ? requestedRoute
          : null;
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
        const ensuredProfile = await api.profiles.ensureForUser(user);
        const completedOnboarding = Boolean(
          user.user_metadata?.[onboardingMetadataKeys.completedAt]
        );

        if (completedOnboarding) {
          const preferredUsername = String(
            existingProfile?.username ||
              ensuredProfile.username ||
              user.user_metadata?.preferred_username ||
              user.email?.split("@")[0] ||
              "user"
          );
          const registrationBio =
            user.user_metadata?.[registrationProfileMetadataKeys.bio];

          await api.profiles.saveRegistrationProfile(
            user.id,
            preferredUsername,
            typeof registrationBio === "string" ? registrationBio : undefined
          );

          const birthDate = getRegistrationBirthDate(user.user_metadata);
          if (birthDate) await savePrivateBirthDate(birthDate);

          const { error: workspaceError } = await supabase.rpc(
            "provision_default_workspaces",
            {
              p_persona: getOnboardingPersona(user.user_metadata),
              p_workspace_name: null,
            }
          );
          if (workspaceError) throw workspaceError;

          window.localStorage.setItem(productTourStorageKey, user.id);
        } else if (!existingProfile) {
          const { error: metadataError } = await api.auth.updateUserMetadata({
            [onboardingMetadataKeys.required]: true,
          });
          if (metadataError) throw metadataError;
        }
        if (active) {
          if (verificationFlow) {
            publishEmailVerificationCompleted(user.id);
            setVerified(true);
          } else {
            router.replace(
              nextRoute || getWorkspaceLandingRoute(user.user_metadata)
            );
          }
        }
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
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {error ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <CircleAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  {t("authCallback.errorTitle")}
                </h1>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button asChild>
                <Link href="/login">{t("authCallback.backToLogin")}</Link>
              </Button>
            </>
          ) : verified ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full border bg-foreground text-background">
                <Check className="size-5" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                  {t("authCallback.verifiedTitle")}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("authCallback.verifiedDescription")}
                </p>
              </div>
            </>
          ) : (
            <>
              <LoaderCircle className="size-7 animate-spin text-foreground" />
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  {t("authCallback.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
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
