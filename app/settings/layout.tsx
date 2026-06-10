import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Setări",
  description:
    "Configurează profilul, limba și preferințele contului ScripticX.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
