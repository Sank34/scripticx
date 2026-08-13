"use client";

import RouteGuard from "@/components/RouteGuard";
import { EmailCenter } from "@/components/admin/email/EmailCenter";

export default function AdminEmailPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <EmailCenter />
    </RouteGuard>
  );
}
