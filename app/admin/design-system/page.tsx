import type { Metadata } from "next";

import RouteGuard from "@/components/RouteGuard";
import { DesignSystemShowcase } from "@/components/admin/design-system/DesignSystemShowcase";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Design system",
  description: "The internal ScripticX interface foundations and component reference.",
  path: "/admin/design-system",
  noIndex: true,
});

export default function DesignSystemPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <DesignSystemShowcase />
    </RouteGuard>
  );
}
