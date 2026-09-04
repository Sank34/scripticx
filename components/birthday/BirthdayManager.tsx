"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { BirthdayCelebration } from "@/components/birthday/BirthdayCelebration";
import { useAuth } from "@/hooks/useAuth";
import {
  type BirthdaySurpriseResult,
} from "@/lib/birthday";
import { claimBirthdaySurprise } from "@/lib/birthdayData";
import {
  hasCompletedProductTour,
  needsOnboarding,
  productTourStorageKey,
} from "@/lib/onboarding";

const excludedRoutes = new Set([
  "/auth/callback",
  "/banned",
  "/lockdown",
  "/login",
]);

function localDateKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function BirthdayManager() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const [dateKey, setDateKey] = useState(localDateKey);
  const [experienceReadyFor, setExperienceReadyFor] = useState<string | null>(null);
  const [celebration, setCelebration] =
    useState<BirthdaySurpriseResult | null>(null);
  const readinessKey = user?.id ? `${user.id}:${pathname}` : null;

  useEffect(() => {
    function synchronizeReadiness() {
      const tourPending = window.localStorage.getItem(productTourStorageKey);
      const tourPendingForCurrentUser =
        (tourPending === user?.id || tourPending === "pending") &&
        !hasCompletedProductTour(user?.user_metadata);

      setExperienceReadyFor(
        readinessKey &&
          !needsOnboarding(user?.user_metadata) &&
          !tourPendingForCurrentUser
          ? readinessKey
          : null
      );
    }

    // Invalidate the previous route/account synchronously before checking the
    // current onboarding state. This prevents a ready state from the login or
    // callback route leaking into the first application page.
    setExperienceReadyFor(null);
    const timer = window.setTimeout(synchronizeReadiness, 900);
    window.addEventListener(
      "scripticx-product-tour-completed",
      synchronizeReadiness
    );
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "scripticx-product-tour-completed",
        synchronizeReadiness
      );
    };
  }, [pathname, readinessKey, user?.id, user?.user_metadata]);

  useEffect(() => {
    function refreshDate() {
      if (document.visibilityState === "visible") setDateKey(localDateKey());
    }

    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);

  const queryKey = useMemo(
    () => ["birthday-surprise", user?.id, dateKey] as const,
    [dateKey, user?.id]
  );
  const birthdayQuery = useQuery({
    queryKey,
    queryFn: claimBirthdaySurprise,
    enabled:
      Boolean(user?.id) &&
      Boolean(profile?.id) &&
      experienceReadyFor === readinessKey &&
      !excludedRoutes.has(pathname),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  useEffect(() => {
    if (!birthdayQuery.data?.claimed) return;

    setCelebration(birthdayQuery.data);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rewards-shop", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    ]);
    window.dispatchEvent(new Event("rewards-updated"));
  }, [birthdayQuery.data, queryClient, user?.id]);

  useEffect(() => {
    if (!birthdayQuery.error) return;
    console.warn("Birthday surprise check failed:", birthdayQuery.error);
  }, [birthdayQuery.error]);

  if (!celebration) return null;

  return (
    <BirthdayCelebration
      profile={profile}
      productIds={celebration.productIds}
      onDismiss={() => setCelebration(null)}
    />
  );
}
