import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Competitions",
  description: "Configure ScripticX competitions and platform access.",
  path: "/admin/competitions",
  noIndex: true,
});

export default function AdminCompetitionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
