"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { User } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";

import { api, type ProfileSummary } from "@/lib/api";
import {
  getOnboardingLandingRoute,
  hasCompletedProductTour,
  needsOnboarding,
  productTourStorageKey,
} from "@/lib/onboarding";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

const OnboardingExperience = dynamic(
  () =>
    import("@/components/onboarding/OnboardingExperience").then(
      (module) => module.OnboardingExperience
    ),
  { ssr: false }
);
const OnboardingPreparing = dynamic(
  () =>
    import("@/components/onboarding/OnboardingPreparing").then(
      (module) => module.OnboardingPreparing
    ),
  { ssr: false }
);
const ProductTour = dynamic(
  () =>
    import("@/components/onboarding/ProductTour").then(
      (module) => module.ProductTour
    ),
  { ssr: false }
);

export function OnboardingManager() {
  const router = useRouter();
  const preparingRef = useRef(false);
  const tourActiveRef = useRef(false);
  const landingRouteRef = useRef("/dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [resolvingProfile, setResolvingProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPreparing, setShowPreparing] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const finishPreparing = useCallback(() => {
    preparingRef.current = false;
    tourActiveRef.current = true;
    setShowPreparing(false);
    setShowTour(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function sync(currentUser: User | null) {
      if (!active) return;

      setUser(currentUser);
      if (!currentUser) {
        preparingRef.current = false;
        tourActiveRef.current = false;
        setProfile(null);
        setResolvingProfile(false);
        setShowOnboarding(false);
        setShowPreparing(false);
        setShowTour(false);
        return;
      }

      landingRouteRef.current = getWorkspaceLandingRoute(
        currentUser.user_metadata
      );

      const requiresOnboarding = needsOnboarding(currentUser.user_metadata);
      setResolvingProfile(requiresOnboarding);
      if (!requiresOnboarding) setShowOnboarding(false);

      try {
        const currentProfile = requiresOnboarding
          ? await api.profiles.ensureForUser(currentUser)
          : await api.profiles.getProfile(currentUser.id);
        if (active) setProfile(currentProfile);
      } catch {
        if (active) setProfile(null);
      }

      if (!active) return;

      setResolvingProfile(false);
      setShowOnboarding(requiresOnboarding);

      if (requiresOnboarding) {
        setShowTour(false);
        return;
      }

      if (preparingRef.current) {
        setShowTour(false);
        return;
      }

      if (tourActiveRef.current) {
        setShowTour(true);
        return;
      }

      const pendingTour = localStorage.getItem(productTourStorageKey);
      const shouldShowTour =
        (pendingTour === currentUser.id || pendingTour === "pending") &&
        !hasCompletedProductTour(currentUser.user_metadata);
      tourActiveRef.current = shouldShowTour;
      setShowTour(shouldShowTour);
    }

    void api.auth.getSession().then(({ data }) => {
      void sync(data.session?.user ?? null);
    });

    const subscription = api.auth.onAuthStateChange((session) => {
      window.setTimeout(() => {
        void sync(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!user) return null;

  if (resolvingProfile) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background text-muted-foreground">
        <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading onboarding" />
      </div>
    );
  }

  if (showPreparing) {
    return <OnboardingPreparing onComplete={finishPreparing} />;
  }

  if (showOnboarding) {
    return (
      <OnboardingExperience
        user={user}
        profile={profile}
        onComplete={(persona) => {
          preparingRef.current = true;
          landingRouteRef.current = getOnboardingLandingRoute(persona);
          localStorage.setItem(productTourStorageKey, user.id);
          setShowOnboarding(false);
          setShowTour(false);
          setShowPreparing(true);
          router.replace("/dashboard");
        }}
      />
    );
  }

  if (showTour) {
    return (
      <ProductTour
        onComplete={() => {
          tourActiveRef.current = false;
          setShowTour(false);
          window.dispatchEvent(
            new Event("scripticx-product-tour-completed")
          );
          router.replace(landingRouteRef.current);
        }}
      />
    );
  }

  return null;
}
