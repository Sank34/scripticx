"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MobileDrawer = dynamic(
  () => import("@/components/MobileDrawer").then((module) => module.MobileDrawer),
  { ssr: false }
);
const NetworkStatus = dynamic(
  () => import("@/components/NetworkStatus").then((module) => module.NetworkStatus),
  { ssr: false }
);
const OnboardingManager = dynamic(
  () =>
    import("@/components/onboarding/OnboardingManager").then(
      (module) => module.OnboardingManager
    ),
  { ssr: false }
);
const BirthdayManager = dynamic(
  () =>
    import("@/components/birthday/BirthdayManager").then(
      (module) => module.BirthdayManager
    ),
  { ssr: false }
);

export function DeferredShellFeatures() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [shellIdle, setShellIdle] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const idleWindow = window as Window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number;
    };

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(
        () => setShellIdle(true),
        { timeout: 700 }
      );
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timeout = window.setTimeout(() => setShellIdle(true), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {isMobile ? <MobileDrawer /> : null}
      <NetworkStatus />
      {shellIdle && pathname !== "/auth/callback" ? <OnboardingManager /> : null}
      {shellIdle ? <BirthdayManager /> : null}
    </>
  );
}
