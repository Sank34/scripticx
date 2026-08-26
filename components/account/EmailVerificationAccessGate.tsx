"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { RegistrationVerification } from "@/components/onboarding/RegistrationVerification";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  clearPendingEmailVerification,
  isEmailVerified,
  pendingEmailVerificationStorageKey,
  readPendingEmailVerification,
  storePendingEmailVerification,
  type PendingEmailVerification,
} from "@/lib/email-verification";
import {
  onboardingMetadataKeys,
  productTourStorageKey,
} from "@/lib/onboarding";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

const VERIFICATION_GATE_EXCLUDED_ROUTES = new Set([
  "/auth/callback",
  "/banned",
  "/forgot-password",
  "/lockdown",
  "/login",
  "/reset-password",
]);

type GateAction = "check" | "resend" | "signout" | null;

export function EmailVerificationAccessGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, reload } = useAuth();
  const [pending, setPending] = useState<PendingEmailVerification | null>(null);
  const [action, setAction] = useState<GateAction>(null);

  const synchronizePending = useCallback(() => {
    setPending(readPendingEmailVerification());
  }, []);

  useEffect(() => {
    synchronizePending();

    function handleStorage(event: StorageEvent) {
      if (event.key === pendingEmailVerificationStorageKey) {
        synchronizePending();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [synchronizePending]);

  useEffect(() => {
    if (!user?.email || isEmailVerified(user)) return;
    storePendingEmailVerification(user.email, user.id);
    synchronizePending();
  }, [synchronizePending, user]);

  const finishVerification = useCallback(async () => {
    const { data } = await api.auth.getSession();
    const verifiedUser = data.session?.user;
    if (!verifiedUser || !isEmailVerified(verifiedUser)) return false;

    clearPendingEmailVerification();
    setPending(null);
    if (verifiedUser.user_metadata?.[onboardingMetadataKeys.completedAt]) {
      window.localStorage.setItem(productTourStorageKey, verifiedUser.id);
    }
    await reload();
    router.replace(getWorkspaceLandingRoute(verifiedUser.user_metadata));
    return true;
  }, [reload, router]);

  useEffect(() => {
    if (!pending) return;

    const subscription = api.auth.onAuthStateChange((session) => {
      if (session?.user && isEmailVerified(session.user)) {
        window.setTimeout(() => void finishVerification(), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [finishVerification, pending]);

  if (VERIFICATION_GATE_EXCLUDED_ROUTES.has(pathname)) return null;

  const email = pending?.email || (!isEmailVerified(user) ? user?.email : null);
  if (!email) return null;
  const verificationEmail = email;

  async function checkVerification() {
    if (action) return;
    setAction("check");

    try {
      const { error } = await api.auth.refreshSession();
      if (error) throw error;
      if (!(await finishVerification())) {
        toast.info(t("login.registration.stillPending"));
      }
    } catch {
      toast.info(t("login.registration.stillPending"));
    } finally {
      setAction(null);
    }
  }

  async function resendVerification() {
    if (action) return;
    setAction("resend");

    const { error } = await api.auth.resendSignupConfirmation(
      verificationEmail,
      `${window.location.origin}/auth/callback?flow=verification`
    );
    setAction(null);

    if (error) {
      toast.error(t("login.modal.resendError"));
      return;
    }
    toast.success(t("login.modal.resendSuccess"));
  }

  async function signOut() {
    if (action) return;
    setAction("signout");
    const { error } = await api.auth.signOut();
    clearPendingEmailVerification();
    setPending(null);
    setAction(null);
    router.replace("/login");

    if (error) toast.error(t("login.registration.signOutError"));
  }

  return (
    <RegistrationVerification
      email={verificationEmail}
      checking={action === "check"}
      resending={action === "resend"}
      signingOut={action === "signout"}
      onCheck={() => void checkVerification()}
      onResend={() => void resendVerification()}
      onSignOut={() => void signOut()}
    />
  );
}
