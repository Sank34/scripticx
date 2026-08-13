"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudentWorkspaceWhiteboard = pathname?.startsWith(
    "/workspace/student/whiteboard"
  );
  const isStudentWorkspaceGraph = pathname?.startsWith(
    "/workspace/student/graph"
  );
  const isStudentWorkspaceNotes = pathname?.startsWith(
    "/workspace/student/notes"
  );
  const isStudentWorkspaceImmersive =
    isStudentWorkspaceWhiteboard ||
    isStudentWorkspaceNotes ||
    isStudentWorkspaceGraph;
  const isProfileSurface =
    pathname === "/profile" || /^\/u\/[^/]+$/.test(pathname || "");
  const isFullWidth =
    pathname === "/editor" ||
    pathname === "/admin/lessons" ||
    isStudentWorkspaceImmersive ||
    /^\/competitions\/[^/]+$/.test(pathname || "") ||
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
      <main
        data-shell-immersive={
          isStudentWorkspaceImmersive ? "true" : undefined
        }
        className={`h-0 min-h-0 flex-1 overflow-hidden bg-background ${
          isStudentWorkspaceImmersive
            ? "pb-[calc(env(safe-area-inset-bottom)+3.25rem)] md:pb-0"
            : ""
        }`}
      >
        {children}
      </main>
    );
  }

  if (isProfileSurface) {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto bg-background [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background pb-16 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {children}
      </div>
    </main>
  );
}
