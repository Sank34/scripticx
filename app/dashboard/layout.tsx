import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Dashboard",
  description:
    "Vezi progresul tău, challenge-ul zilei, scorul, activitatea recentă și clasamentul ScripticX.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
