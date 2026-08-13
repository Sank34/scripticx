"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { isEmailVerified } from "@/lib/email-verification";
import {
  MailClientError,
  resendVerificationEmail,
} from "@/lib/mail-client";

const DEFAULT_COOLDOWN_SECONDS = 60;
const VERIFICATION_SENT_EVENT = "scripticx:verification-email-sent";

type VerificationSentDetail = {
  userId: string;
  nextAllowedAt: number;
};

function cooldownStorageKey(userId: string) {
  return `scripticx:verification-email-cooldown:${userId}`;
}

function readStoredCooldown(userId: string) {
  try {
    const value = Number(window.localStorage.getItem(cooldownStorageKey(userId)));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return 0;
  }
}

function storeCooldown(userId: string, nextAllowedAt: number) {
  try {
    window.localStorage.setItem(
      cooldownStorageKey(userId),
      String(nextAllowedAt)
    );
  } catch {
    // The in-memory cooldown still protects the current view.
  }

  window.dispatchEvent(
    new CustomEvent<VerificationSentDetail>(VERIFICATION_SENT_EVENT, {
      detail: { userId, nextAllowedAt },
    })
  );
}

export function useEmailVerification() {
  const { user, reload } = useAuth();
  const { locale, t } = useLanguage();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sent, setSent] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const verified = isEmailVerified(user);
  const needsVerification = Boolean(user?.email && !verified);
  const cooldownSeconds = Math.max(
    0,
    Math.ceil((nextAllowedAt - now) / 1000)
  );

  useEffect(() => {
    if (!user?.id) {
      setNextAllowedAt(0);
      setSent(false);
      return;
    }

    const userId = user.id;
    setNextAllowedAt(readStoredCooldown(userId));

    function handleVerificationSent(event: Event) {
      const detail = (event as CustomEvent<VerificationSentDetail>).detail;
      if (detail?.userId !== userId) return;
      setNextAllowedAt(detail.nextAllowedAt);
      setSent(true);
    }

    window.addEventListener(VERIFICATION_SENT_EVENT, handleVerificationSent);
    return () => {
      window.removeEventListener(
        VERIFICATION_SENT_EVENT,
        handleVerificationSent
      );
    };
  }, [user?.id]);

  useEffect(() => {
    if (!nextAllowedAt || nextAllowedAt <= Date.now()) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [nextAllowedAt]);

  const resend = useCallback(async () => {
    if (!user?.id || !needsVerification || sending || cooldownSeconds > 0) {
      return false;
    }

    setSending(true);
    try {
      const response = await resendVerificationEmail(locale);
      const retryAfterSeconds = Math.max(
        1,
        response.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS
      );
      const next = Date.now() + retryAfterSeconds * 1_000;
      setNow(Date.now());
      setNextAllowedAt(next);
      setSent(true);
      storeCooldown(user.id, next);
      toast.success(t("emailVerification.sentToast"));
      return true;
    } catch (error) {
      if (error instanceof MailClientError && error.retryAfterSeconds) {
        const next = Date.now() + error.retryAfterSeconds * 1_000;
        setNow(Date.now());
        setNextAllowedAt(next);
        storeCooldown(user.id, next);
      }
      toast.error(t("emailVerification.errorToast"));
      return false;
    } finally {
      setSending(false);
    }
  }, [cooldownSeconds, locale, needsVerification, sending, t, user?.id]);

  const refresh = useCallback(async () => {
    if (!user || refreshing) return false;

    setRefreshing(true);
    try {
      const { data, error } = await api.auth.refreshSession();
      if (error) throw error;
      await reload();

      const confirmed = isEmailVerified(data.user);
      if (confirmed) {
        toast.success(t("emailVerification.verifiedToast"));
      } else {
        toast.info(t("emailVerification.stillPendingToast"));
      }
      return confirmed;
    } catch {
      toast.error(t("emailVerification.refreshErrorToast"));
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, reload, t, user]);

  return useMemo(
    () => ({
      cooldownSeconds,
      email: user?.email || "",
      needsVerification,
      refresh,
      refreshing,
      resend,
      sending,
      sent,
      verified,
    }),
    [
      cooldownSeconds,
      needsVerification,
      refresh,
      refreshing,
      resend,
      sending,
      sent,
      user?.email,
      verified,
    ]
  );
}
