"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export default function RouteGuard({
  children,
  requireAuth,
  requireAdmin,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, loading, isAdmin, isBanned } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isBanned) {
      router.push("/banned");
      return;
    }

    if (requireAuth && !user) {
      router.push("/login");
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.push("/");
      return;
    }
  }, [user, loading, isAdmin, isBanned, requireAuth, requireAdmin, router]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return children;
}
