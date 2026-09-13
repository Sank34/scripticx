import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Badge Management",
  description: "Create and manage ScripticX achievement badges.",
  path: "/admin/badges",
  noIndex: true,
});

export default function AdminBadgesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
