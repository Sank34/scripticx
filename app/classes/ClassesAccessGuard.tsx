"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  canAccessClassesForAccount,
  getDefaultWorkspaceRoute,
  getWorkspacePersonaFromMetadata,
} from "@/lib/workspaces";

export function ClassesAccessGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { isAdmin, loading, user } = useAuth();
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const persona = getWorkspacePersonaFromMetadata(metadata) || "learner";
  const allowed = !user || canAccessClassesForAccount(persona, isAdmin);

  useEffect(() => {
    if (loading || !user || allowed) return;
    router.replace(getDefaultWorkspaceRoute(persona));
  }, [allowed, loading, persona, router, user]);

  if (loading || (user && !allowed)) {
    return (
      <PageContainer variant="wide" className="sx-page space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-28 w-full rounded-[var(--sx-radius-card)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-64 rounded-[var(--sx-radius-card)]"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  return children;
}
