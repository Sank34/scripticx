"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { LegacyAlphaWelcome } from "./LegacyAlphaWelcome";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

import { api, type ProfileSummary } from "@/lib/api";
import {
  getOnboardingLandingRoute,
  hasCompletedProductTour,
  needsOnboarding,
  productTourStorageKey,
  onboardingMetadataKeys,
  shouldShowLegacyAlphaWelcome,
  legacyAlphaCohortKey,
} from "@/lib/onboarding";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

import { OnboardingExperience } from "./OnboardingExperience";
import { OnboardingPreparing } from "./OnboardingPreparing";
import { ProductTour } from "./ProductTour";

type Phase = "idle" | "loading" | "welcome" | "setup" | "preparing" | "ready" | "tour" | "error";

export function OnboardingManager() {
  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const activeUserRef = useRef<string | null>(null);
  const landingRouteRef = useRef("/dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [startingLegacyOnboarding, setStartingLegacyOnboarding] = useState(false);
  const [retrySync, setRetrySync] = useState(0);

  const transitionTo = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const finishPreparing = useCallback(() => transitionTo("ready"), [transitionTo]);

  useEffect(() => {
    let active = true;
    let revision = 0;

    async function sync(currentUser: User | null) {
      if (!active) return;
      const currentRevision = ++revision;
      const sameUser = activeUserRef.current === (currentUser?.id ?? null);
      if (!sameUser) {
        activeUserRef.current = currentUser?.id ?? null;
        setProfile(null);
        setStartingLegacyOnboarding(false);
        transitionTo("idle");
      }
      setUser(currentUser);
      if (!currentUser) {
        transitionTo("idle");
        return;
      }

      // Metadata saves and token refreshes must not interrupt an active screen.
      if (sameUser && !["idle", "loading"].includes(phaseRef.current)) return;
      landingRouteRef.current = getWorkspaceLandingRoute(currentUser.user_metadata);

      if (needsOnboarding(currentUser.user_metadata)) {
        transitionTo("loading");
        try {
          const currentProfile = await api.profiles.ensureForUser(currentUser);
          if (!active || currentRevision !== revision) return;
          if (currentUser.app_metadata?.[legacyAlphaCohortKey] === true) {
            const { error } = await supabase.rpc("claim_alpha_background_gift");
            if (error) throw error;
          }
          if (!active || currentRevision !== revision) return;
          setProfile(currentProfile);
          transitionTo(shouldShowLegacyAlphaWelcome(currentUser) ? "welcome" : "setup");
        } catch {
          if (active && currentRevision === revision) transitionTo("error");
        }
        return;
      }

      const pendingTour = localStorage.getItem(productTourStorageKey);
      if ((pendingTour === currentUser.id || pendingTour === "pending") &&
          !hasCompletedProductTour(currentUser.user_metadata)) {
        transitionTo("preparing");
      } else {
        transitionTo("idle");
      }
    }

    void api.auth.getSession().then(({ data }) => {
      if (revision === 0) void sync(data.session?.user ?? null);
    });
    const subscription = api.auth.onAuthStateChange((session) => {
      window.setTimeout(() => void sync(session?.user ?? null), 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [retrySync, transitionTo]);

  // Registration can queue its tour after the sign-in event has already fired.
  useEffect(() => {
    if (phase !== "idle" || !user || pathname === "/login" || pathname === "/auth/callback") return;
    if (needsOnboarding(user.user_metadata) || hasCompletedProductTour(user.user_metadata)) return;
    if (localStorage.getItem(productTourStorageKey) === user.id) transitionTo("preparing");
  }, [pathname, phase, transitionTo, user]);

  async function startLegacyOnboarding() {
    if (!user || startingLegacyOnboarding) return;
    const userId = user.id;
    setStartingLegacyOnboarding(true);
    try {
      const { error } = await api.auth.updateUserMetadata({
        [onboardingMetadataKeys.legacyWelcomeSeenAt]: new Date().toISOString(),
      });
      if (error) throw error;
      if (activeUserRef.current === userId) transitionTo("setup");
    } catch {
      if (activeUserRef.current === userId) toast.error(locale === "ro" ? "Configurarea nu a putut fi pornită. Încearcă din nou." : "Could not start onboarding. Please try again.");
    } finally {
      if (activeUserRef.current === userId) setStartingLegacyOnboarding(false);
    }
  }

  if (!user || phase === "idle") return null;

  if (phase === "loading") return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background text-muted-foreground">
      <LoaderCircle className="h-6 w-6 animate-spin" aria-label={locale === "ro" ? "Se încarcă configurarea" : "Loading onboarding"} />
    </div>
  );

  if (phase === "error") return (
    <div role="alert" className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p>{locale === "ro" ? "Nu am putut pregăti contul. Încearcă din nou." : "We couldn’t prepare your account. Please try again."}</p>
      <Button onClick={() => { transitionTo("loading"); setRetrySync(value => value + 1); }}>{locale === "ro" ? "Reîncearcă" : "Retry"}</Button>
    </div>
  );

  if (phase === "preparing" || phase === "ready") return (
    <OnboardingPreparing ready={phase === "ready"} onComplete={finishPreparing} onStart={() => transitionTo("tour")} />
  );
  if (phase === "welcome") return <LegacyAlphaWelcome starting={startingLegacyOnboarding} onStart={() => void startLegacyOnboarding()} />;
  if (phase === "setup") return (
    <OnboardingExperience
      user={user}
      profile={profile}
      onComplete={(persona) => {
        if (activeUserRef.current !== user.id) return;
        landingRouteRef.current = getOnboardingLandingRoute(persona);
        localStorage.setItem(productTourStorageKey, user.id);
        transitionTo("preparing");
        router.replace(landingRouteRef.current);
      }}
    />
  );

  return (
    <ProductTour
      onComplete={() => {
        transitionTo("idle");
        window.dispatchEvent(new Event("scripticx-product-tour-completed"));
        router.replace(landingRouteRef.current);
      }}
    />
  );
}
