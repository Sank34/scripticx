"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = pathname?.startsWith("/problems/") && pathname !== "/problems";

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
