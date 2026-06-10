import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Profilul meu",
  description:
    "Vezi progresul, realizările și activitatea profilului tău ScripticX.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
