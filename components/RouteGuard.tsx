"use client";

import { useEffect } from "react";
import { canAccessAdminPage } from "@/lib/permissions";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isEmailVerified,
  storePendingEmailVerification,
} from "@/lib/email-verification";

export default function RouteGuard({
  children,
  requireAuth,
  requireAdmin,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, loading: authLoading, isAdmin, isBanned, can, canAccessAdmin, permissionsLoading } = useAuth();
  const adminAllowed = canAccessAdminPage(usePathname(), can, isAdmin, canAccessAdmin);
  const loading = authLoading || Boolean(requireAdmin && permissionsLoading);
  const router = useRouter();
  const verified = isEmailVerified(user);

  useEffect(() => {
    if (loading) return;

    if (isBanned) {
      router.replace("/banned");
      return;
    }

    if (requireAuth && user && !verified) {
      if (user.email) storePendingEmailVerification(user.email, user.id);
      router.replace("/login?verification=pending");
      return;
    }

    if (requireAuth && !user) {
      router.replace("/login");
      return;
    }

    if (requireAdmin && !adminAllowed) {
      router.replace("/");
      return;
    }
  }, [
    user,
    loading,
    adminAllowed,
    isBanned,
    requireAuth,
    requireAdmin,
    router,
    verified,
  ]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (
    isBanned ||
    (requireAuth && !user) ||
    (requireAuth && !verified) ||
    (requireAdmin && !adminAllowed)
  ) {
    return null;
  }

  return children;
}
