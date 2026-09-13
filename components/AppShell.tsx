"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { DeferredShellFeatures } from "@/components/DeferredShellFeatures";
import { GlobalContextMenu } from "@/components/navigation/GlobalContextMenu";
import { EmailVerificationBanner } from "@/components/account/EmailVerification";
import { MainWrapper } from "@/components/MainWrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Topbar } from "@/components/Topbar";

const AUTH_SURFACE_ROUTES = new Set([
  "/auth/callback",
  "/forgot-password",
  "/login",
  "/reset-password",
]);

function isAuthSurface(pathname: string) {
  return AUTH_SURFACE_ROUTES.has(pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAuthSurface(pathname)) {
    return (
      <div data-auth-surface className="relative h-svh w-full overflow-y-auto bg-background md:h-dvh">
        {children}
      </div>
    );
  }

  return (
    <GlobalContextMenu>
      <SidebarProvider>
        <div
          data-shell-root
          className="h-svh w-full overflow-hidden bg-sidebar p-2 md:h-dvh"
        >
          <div
            data-shell-frame
            className="flex h-full w-full gap-2 overflow-hidden rounded-[var(--sx-radius-shell)] bg-sidebar"
          >
            <AppSidebar />
            <div
              data-shell-surface
              className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--sx-radius-shell)] border border-border/70 bg-background shadow-sm"
            >
              <Topbar />
              <EmailVerificationBanner />
              <MainWrapper>{children}</MainWrapper>
            </div>
          </div>
        </div>
      </SidebarProvider>
      <DeferredShellFeatures />
    </GlobalContextMenu>
  );
}
