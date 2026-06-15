import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Settings",
  description:
    "Manage your ScripticX profile, language, and account preferences.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
