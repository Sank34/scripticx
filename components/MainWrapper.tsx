"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth =
    pathname === "/editor" ||
    (pathname?.startsWith("/problems/") && pathname !== "/problems") ||
    (pathname?.startsWith("/groups/") && pathname !== "/groups") ||
    pathname?.startsWith("/invite/") ||
    pathname?.startsWith("/live/");

  useEffect(() => {
    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason;
      if (r && typeof r === "object" && (r as any).type === "cancelation") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => window.removeEventListener("unhandledrejection", onRejection, true);
  }, []);

  if (isFullWidth) {
    return (
      <main className="min-h-0 flex-1 overflow-hidden bg-white">
        {children}
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-16 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {children}
      </div>
    </main>
  );
}
