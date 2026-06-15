import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "My Profile",
  description:
    "View your ScripticX progress, achievements, and community activity.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
